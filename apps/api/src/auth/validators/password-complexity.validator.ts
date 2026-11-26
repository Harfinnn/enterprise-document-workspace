
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "PasswordComplexity", async: false })
export class PasswordComplexityConstraint
  implements ValidatorConstraintInterface
{
  validate(password: string): boolean {
    if (typeof password !== "string") return false;

    return (
      password.length >= 12 &&
      password.length <= 128 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  }

  defaultMessage(): string {
    return "Password harus minimal 12 karakter dan mengandung huruf kapital, huruf kecil, angka, serta karakter spesial.";
  }
}

export function IsPasswordComplexity(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "IsPasswordComplexity",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: PasswordComplexityConstraint,
    });
  };
}
