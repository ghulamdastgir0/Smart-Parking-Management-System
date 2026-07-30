import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const COMPLEXITY_PATTERNS = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/];

@ValidatorConstraint({ name: 'isPasswordComplex', async: false })
export class IsPasswordComplexConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const matched = COMPLEXITY_PATTERNS.filter((pattern) =>
      pattern.test(value),
    ).length;
    return matched >= 3;
  }

  defaultMessage(): string {
    return 'Password must include at least 3 of: uppercase, lowercase, a number, and a symbol';
  }
}

export function IsPasswordComplex(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPasswordComplexConstraint,
    });
  };
}
