import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { v1 as uuidV1 } from 'uuid';
import Checkbox from '../Checkbox';
import Switch from '../../form/CheckboxFieldGroup/components/Switch';
import { FieldErrors } from '../';

import './style.scss';

class CheckboxFieldGroup extends PureComponent {
  static propTypes = {
    id: PropTypes.string,
    className: PropTypes.string,
    label: PropTypes.string.isRequired,
    labelClassname: PropTypes.string,
    showTextLabel: PropTypes.bool,
    displaySwitch: PropTypes.bool,
    errors: PropTypes.arrayOf(PropTypes.string),
  };

  static defaultProps = {
    id: undefined,
    className: null,
    labelClassname: null,
    showTextLabel: false,
    displaySwitch: false,
    errors: [],
  };

  state = {}

  render() {
    const {
      id,
      label,
      labelClassname,
      className,
      showTextLabel,
      errors,
      displaySwitch,
      ...inputProps
    } = this.props;

    const checkboxId = id || uuidV1();

    const renderCheckbox = () => (
      <Checkbox id={checkboxId} label={label} {...inputProps} />
    );

    const renderSwitch = () => (
      <div>
        <Switch id={checkboxId} label={label} {...inputProps} />
        {showTextLabel &&
          <label
            htmlFor={checkboxId}
            className={classnames('m-switch-field-group__label', labelClassname)}
          >
            {label}
          </label>
        }
      </div>
    );

    return (
      <div className={classnames('m-switch-field-group', className)}>
        {displaySwitch ? renderSwitch() : renderCheckbox()}
        {errors.length > 0 && (
          <FieldErrors className="m-text-field-group__errors" errors={errors} />
        )}
      </div>
    );
  }
}

export default CheckboxFieldGroup;
