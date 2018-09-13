import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Title, Link } from '../../../../components/';
import ContactItem from '../ContactItem';
import { DEFAULT_SORT_DIR } from '../../presenter';
import { getFirstLetter, formatName, getContactTitle } from '../../../../services/contact';

import './style.scss';

const ALPHA = '#abcdefghijklmnopqrstuvwxyz';

class ContactList extends PureComponent {
  static propTypes = {
    contacts: PropTypes.arrayOf(PropTypes.shape({})),
    selectedContactsIds: PropTypes.arrayOf(PropTypes.string),
    contactDisplayOrder: PropTypes.string.isRequired,
    contactDisplayFormat: PropTypes.string.isRequired,
    onSelectEntity: PropTypes.func.isRequired,
    sortDir: PropTypes.string,
  };
  static defaultProps = {
    contacts: [],
    selectedContactsIds: [],
    sortDir: DEFAULT_SORT_DIR,
  };

  getFirstLetter = () => {
    const { sortDir } = this.props;

    return ALPHA.split('').sort((a, b) => {
      switch (sortDir) {
        default:
        case 'ASC':
          return (a || '').localeCompare(b);
        case 'DESC':
          return (b || '').localeCompare(a);
      }
    });
  }

  renderNav(firstLettersWithContacts = []) {
    const firstLetters = this.getFirstLetter();

    return (
      <div className="m-contact-list__nav">
        {firstLetters.map(letter => (
          <Link
            href={`#letter-${letter}`}
            className={classnames('m-contact-list__alpha-letter', { 'm-contact-list__alpha-letter--active': firstLettersWithContacts.includes(letter) })}
            key={letter}
          >
            {letter}
          </Link>
        ))}
      </div>
    );
  }

  renderPlaceholder() {
    const noop = () => {};

    return (
      <div className="m-contact-list">
        {this.renderNav()}
        <div className="m-contact-list__list">
          <div className="m-contact-list__group">
            {[1, 2, 3, 4, 5].map(key => (
              <ContactItem
                key={key}
                className="m-contact-list__contact"
                onSelectEntity={noop}
                isContactSelected={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  render() {
    const {
      contacts, contactDisplayOrder, contactDisplayFormat: format, onSelectEntity,
      selectedContactsIds,
    } = this.props;

    if (!contacts.length) {
      return this.renderPlaceholder();
    }

    const contactsGroupedByLetter = contacts
      .sort((a, b) => (a[contactDisplayOrder] || getContactTitle(a))
        .localeCompare(b[contactDisplayOrder] || getContactTitle(b)))
      .reduce((acc, contact) => {
        const firstLetter =
          getFirstLetter(contact[contactDisplayOrder] || formatName({ contact, format }));

        return {
          ...acc,
          [firstLetter]: [
            ...(acc[firstLetter] || []),
            contact,
          ],
        };
      }, {});

    const firstLettersWithContacts = Object.keys(contactsGroupedByLetter);
    const firstLetters = this.getFirstLetter(firstLettersWithContacts);

    return (
      <div className="m-contact-list">
        {this.renderNav(firstLettersWithContacts)}
        <div className="m-contact-list__list">
          {firstLetters.map(letter => (
            contactsGroupedByLetter[letter] && (
              <div key={letter} className="m-contact-list__group">
                <Title caps hr size="large" className="m-contact-list__alpha-title" id={`letter-${letter}`}>{letter}</Title>
                {contactsGroupedByLetter[letter].map(contact => (
                  <ContactItem
                    key={contact.contact_id}
                    className="m-contact-list__contact"
                    contact={contact}
                    onSelectEntity={onSelectEntity}
                    isContactSelected={selectedContactsIds.includes(contact.contact_id)}
                  />
                ))}
              </div>
            )
          ))}
        </div>
      </div>
    );
  }
}

export default ContactList;
