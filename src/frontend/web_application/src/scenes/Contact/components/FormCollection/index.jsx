import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Trans } from '@lingui/react';
import { FieldArray, FormSection } from 'redux-form';
import { Button, FormGrid, FormRow, FormColumn } from '../../../../components/';
import TextList, { TextItem } from '../../../../components/TextList';

class FormCollection extends PureComponent {
  static propTypes = {
    propertyName: PropTypes.string.isRequired,
    component: PropTypes.element.isRequired,
    showAdd: PropTypes.bool,
    addButtonLabel: PropTypes.node,
  };
  static defaultProps = {
    showAdd: true,
    addButtonLabel: undefined,
  };

  renderForms = ({ fields }) => {
    const { component, showAdd, addButtonLabel } = this.props;
    const addLabel = addButtonLabel || (
      <Trans id="contact.action.add_new_field">Add new</Trans>
    );

    return (
      <TextList>
        {fields.map((fieldName, index) => (
          <TextItem key={index} large>
            <FormSection name={fieldName}>
              <component.type onDelete={() => fields.remove(index)} />
            </FormSection>
          </TextItem>
        ))}
        {showAdd && (
          <TextItem large>
            <FormGrid>
              <FormRow>
                <FormColumn>
                  <Button icon="plus" shape="plain" onClick={() => fields.push({ })}>
                    {addLabel}
                  </Button>
                </FormColumn>
              </FormRow>
            </FormGrid>
          </TextItem>
        )}
      </TextList>
    );
  };

  render() {
    const { propertyName } = this.props;

    return (
      <FieldArray name={propertyName} component={this.renderForms} />
    );
  }
}

export default FormCollection;
