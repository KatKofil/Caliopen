import React, { PropTypes } from 'react';
import classnames from 'classnames';
import './style.scss';

const FieldErrors = ({ errors = [], className }) => (
  <ul className={classnames('m-field-errors', className)}>
    { errors.map((error, key) => (
      <li key={key}>{error}</li>
    ))}
  </ul>
);

FieldErrors.propTypes = {
  errors: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};

export default FieldErrors;