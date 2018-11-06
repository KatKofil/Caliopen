package REST

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	. "github.com/CaliOpen/Caliopen/src/backend/defs/go-objects"
	"github.com/CaliOpen/go-twitter/twitter"
	"github.com/dghubble/oauth1"
	twitterOAuth1 "github.com/dghubble/oauth1/twitter"
	"github.com/satori/go.uuid"
	"golang.org/x/oauth2"
	googleOAuth2 "golang.org/x/oauth2/google"
	googleApi "google.golang.org/api/oauth2/v2"
	"net/http"
)

const CALLBACK_BASE_URI = "/api/v2/providers/%s/callback"

func (rest *RESTfacility) RetrieveProvidersList() (providers []Provider, err error) {
	if rest.providers != nil {
		providers = []Provider{}
		for _, provider := range rest.providers {
			providers = append(providers, provider)
		}
		return providers, nil
	}
	return providers, errors.New("providers slice is nil")
}

// GetProviderOauthFor returns provider's params required for authenticated user to initiate an Oauth request
// In case of Twitter, auth request url is fetched from twitter API endpoint on the fly.
// For all requests, an Oauth session cache is initialized for requesting user, making use of cache facility.
func (rest *RESTfacility) GetProviderOauthFor(userId, name string) (provider Provider, err CaliopenError) {
	provider, found := rest.providers[name]
	if found {
		switch provider.Name {
		case "twitter":
			requestToken, requestSecret, e := setTwitterAuthRequestUrl(&provider, rest.hostname)
			if e != nil {
				err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[GetProviderOauthFor] failed to set twitter aut request")
				return
			}
			rest.Cache.SetOauthSession(requestToken, &OauthSession{
				RequestSecret: requestSecret,
				UserId:        userId,
			})
		case "gmail":
			state, e := setGoogleAuthRequestUrl(&provider, rest.hostname)
			if e != nil {
				err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[GetProviderOauthFor] failed to set twitter aut request")
				return
			}
			rest.Cache.SetOauthSession(state, &OauthSession{
				UserId: userId,
			})
		default:
			err = NewCaliopenErr(NotImplementedCaliopenErr, "not implemented")
			return
		}
		return
	}
	err = NewCaliopenErr(NotFoundCaliopenErr, "not found")
	return
}

func (rest *RESTfacility) CreateTwitterIdentity(requestToken, verifier string) (remoteId string, err CaliopenError) {
	provider := rest.providers[TwitterProtocol]
	conf := &oauth1.Config{
		ConsumerKey:    provider.Infos["consumer_key"],
		ConsumerSecret: provider.Infos["consumer_secret"],
		Endpoint:       twitterOAuth1.AuthorizeEndpoint,
	}
	oauthCache, e := rest.Cache.GetOauthSession(requestToken)
	if e != nil {
		err = WrapCaliopenErrf(e, NotFoundCaliopenErr, "[CreateTwitterIdentity] failed to retrieve Oauth session in cache for request token %s", requestToken)
		return
	}
	accessToken, accessSecret, e := conf.AccessToken(requestToken, oauthCache.RequestSecret, verifier)
	if e != nil {
		err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[CreateTwitterIdentity] AccessToken request failed")
	}

	// retrieve twitter profile from Twitter api
	token := oauth1.NewToken(accessToken, accessSecret)
	httpClient := conf.Client(oauth1.NoContext, token)
	twitterClient := twitter.NewClient(httpClient)
	accountVerifyParams := &twitter.AccountVerifyParams{
		IncludeEntities: twitter.Bool(false),
		SkipStatus:      twitter.Bool(true),
		IncludeEmail:    twitter.Bool(false),
	}
	twitterUser, resp, e := twitterClient.Accounts.VerifyCredentials(accountVerifyParams)
	if e != nil || resp.StatusCode != http.StatusOK ||
		twitterUser == nil || twitterUser.ID == 0 || twitterUser.IDStr == "" {
		err = NewCaliopenErr(FailDependencyCaliopenErr, "[CreateTwitterIdentity] twitter client failed to get Twitter User")
		return
	}

	// build user identity
	//1.check if this user_identity already exists
	foundIdentities, e := rest.store.LookupIdentityByIdentifier(twitterUser.ScreenName, TwitterProtocol)
	if e != nil {
		err = WrapCaliopenErrf(e, DbCaliopenErr, "[CreateTwitterIdentity] failed to lookup in store if identity already exists. Aborting")
		return
	}
	foundCount := len(foundIdentities)
	switch foundCount {
	case 0:
		userIdentity := new(UserIdentity)
		userID := UUID(uuid.FromStringOrNil(oauthCache.UserId))
		userIdentity.MarshallNew(userID)
		userIdentity.Protocol = TwitterProtocol
		userIdentity.Type = RemoteIdentity
		userIdentity.DisplayName = twitterUser.Name
		userIdentity.Identifier = twitterUser.ScreenName
		userIdentity.Credentials = &Credentials{
			"token":  accessToken,
			"secret": accessSecret,
		}
		userIdentity.Infos = map[string]string{
			"provider": "twitter",
			"authtype": Oauth1,
		}
		// save identity
		e := rest.CreateUserIdentity(userIdentity)
		if e != nil {
			err = WrapCaliopenErr(e, FailDependencyCaliopenErr, "[CreateTwitterIdentity] failed to create user identity")
			return
		}
		remoteId = userIdentity.Id.String()
		return
	case 1:
		// this twitter identity already exists, checking if it belongs to this user and, if ok, just updating Twitter's name
		storedIdentity, e := rest.RetrieveUserIdentity(foundIdentities[0][0], foundIdentities[0][1], false)
		if e != nil || storedIdentity == nil {
			err = WrapCaliopenErrf(e, DbCaliopenErr, "[CreateTwitterIdentity] failed to retrieve user identity found for twitter account %s", twitterUser.ScreenName)
			return
		}
		modifiedFields := map[string]interface{}{
			"DisplayName": twitterUser.Name,
		}
		storedIdentity.DisplayName = twitterUser.Name
		if e := rest.store.UpdateUserIdentity(storedIdentity, modifiedFields); e != nil {
			err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[CreateTwitterIdentity] failed to update user identity in db")
			return
		}
		remoteId = storedIdentity.Id.String()
		return
	default:
		err = NewCaliopenErrf(FailDependencyCaliopenErr, "[CreateTwitterIdentity] inconsistency in store : more than one identity found with twitter screen name <%s>", twitterUser.ScreenName)
		return
	}
}

func (rest *RESTfacility) CreateGmailIdentity(state, code string) (remoteId string, err CaliopenError) {

	// start by checking if we have the state in cache
	oauthCache, e := rest.Cache.GetOauthSession(state)
	if e != nil {
		err = WrapCaliopenErrf(e, NotFoundCaliopenErr, "[CreateGmailIdentity] failed to retrieve Oauth session in cache for state %s", state)
		return
	}

	gmailProvider := rest.providers["gmail"]
	gmailProvider.OauthCallbackUri = fmt.Sprintf(CALLBACK_BASE_URI, "gmail")

	oauthConfig := setGoogleOauthConfig(gmailProvider, rest.hostname)

	ctx := context.TODO()

	// get the access token that will be added to UserIdentity.Credentials
	token, e := oauthConfig.Exchange(ctx, code)
	if e != nil {
		err = WrapCaliopenErrf(e, NotFoundCaliopenErr, "[CreateGmailIdentity] failed to retrieve access token for state %s", state)
		return
	}
	// retrieve gmail profile from Google api
	httpClient := oauthConfig.Client(ctx, token)
	googleService, e := googleApi.New(httpClient)
	if e != nil {
		err = WrapCaliopenErr(e, NotFoundCaliopenErr, "[CreateGmailIdentity] failed to create google service")
		return
	}
	googleUser, e := googleService.Userinfo.Get().Do()
	if e != nil {
		err = WrapCaliopenErr(e, NotFoundCaliopenErr, "[CreateGmailIdentity] failed to retrieve user from google api")
		return
	}
	// build user identity
	// 1. check if this user_identity already exists
	foundIdentities, e := rest.store.LookupIdentityByIdentifier(googleUser.Email, EmailProtocol)
	if e != nil {
		err = WrapCaliopenErrf(e, DbCaliopenErr, "[CreateGmailIdentity] failed to lookup in store if identity already exists. Aborting")
		return
	}
	foundCount := len(foundIdentities)
	switch foundCount {
	case 0:
		userIdentity := new(UserIdentity)
		userID := UUID(uuid.FromStringOrNil(oauthCache.UserId))
		userIdentity.MarshallNew(userID)
		userIdentity.Protocol = EmailProtocol
		userIdentity.Type = RemoteIdentity
		userIdentity.DisplayName = googleUser.Name
		userIdentity.Identifier = googleUser.Email
		userIdentity.Credentials = &Credentials{
			"oauth2token": token.AccessToken,
			"username":    googleUser.Email,
		}
		userIdentity.Infos = map[string]string{
			"inserver":  gmailProvider.Infos["imapserver"],
			"outserver": gmailProvider.Infos["smtpserver"],
			"provider":  "gmail",
			"authtype":  Oauth2,
		}

		// save identity
		e := rest.CreateUserIdentity(userIdentity)
		if e != nil {
			err = WrapCaliopenErr(e, FailDependencyCaliopenErr, "[CreateGmailIdentity] failed to create user identity")
			return
		}
		remoteId = userIdentity.Id.String()
	case 1:
		// this identity already exists, checking if it belongs to this user and, if ok, just updating display name and token
		storedIdentity, e := rest.RetrieveUserIdentity(foundIdentities[0][0], foundIdentities[0][1], false)
		if e != nil || storedIdentity == nil {
			err = WrapCaliopenErrf(e, DbCaliopenErr, "[CreateGmailIdentity] failed to retrieve user identity found for twitter account %s", googleUser.Name)
			return
		}
		storedIdentity.DisplayName = googleUser.Name
		storedIdentity.Credentials = &Credentials{
			"oauth2token": token.AccessToken,
			"username":    storedIdentity.Identifier,
		}

		modifiedFields := map[string]interface{}{
			"DisplayName": googleUser.Name,
			"Credentials": storedIdentity.Credentials,
		}
		if e := rest.store.UpdateUserIdentity(storedIdentity, modifiedFields); e != nil {
			err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[CreateGmailIdentity] failed to update user identity in db")
			return
		}
		remoteId = storedIdentity.Id.String()
		return
	default:
		err = NewCaliopenErrf(FailDependencyCaliopenErr, "[CreateGmailIdentity] inconsistency in store : more than one identity found with email <%s>", googleUser.Email)
		return
	}
	return
}

func setTwitterAuthRequestUrl(provider *Provider, hostname string) (requestToken, requestSecret string, err CaliopenError) {

	provider.OauthCallbackUri = fmt.Sprintf(CALLBACK_BASE_URI, "twitter")

	//IMPORTANT TODO: make use of vault to store consumer key and secret
	conf := &oauth1.Config{
		ConsumerKey:    provider.Infos["consumer_key"],
		ConsumerSecret: provider.Infos["consumer_secret"],
		CallbackURL:    "http://" + hostname + provider.OauthCallbackUri,
		Endpoint:       twitterOAuth1.AuthorizeEndpoint,
	}
	requestToken, requestSecret, e := conf.RequestToken()
	if e != nil {
		err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[setTwitterAuthRequestUrl] failed with RequestToken()")
		return
	}
	authUrl, e := conf.AuthorizationURL(requestToken)
	if e != nil {
		err = WrapCaliopenErrf(e, FailDependencyCaliopenErr, "[setTwitterAuthRequestUrl] failed with AuthorizationURL()")
		return
	}
	provider.OauthRequestUrl = authUrl.String()
	return
}

func setGoogleAuthRequestUrl(provider *Provider, hostname string) (state string, err error) {

	provider.OauthCallbackUri = fmt.Sprintf(CALLBACK_BASE_URI, "gmail")

	config := setGoogleOauthConfig(*provider, hostname)

	state = randomState()
	provider.OauthRequestUrl = config.AuthCodeURL(state)
	return
}

func setGoogleOauthConfig(provider Provider, hostname string) *oauth2.Config {
	return &oauth2.Config{
		ClientID:     provider.Infos["client_id"],
		ClientSecret: provider.Infos["client_secret"],
		Endpoint:     googleOAuth2.Endpoint,
		RedirectURL:  "http://" + hostname + provider.OauthCallbackUri,
		Scopes:       []string{"profile", "email", "https://mail.google.com/"},
	}
}

// Returns a base64 encoded random 32 byte string.
func randomState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}