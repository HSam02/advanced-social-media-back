import { body, oneOf } from "express-validator";

export const registerValidation = [
  body("email", "Invalid email").isEmail(),
  body("username")
    .isLength({ min: 2 })
    .withMessage("Minimum two characters")
    .matches(/^[a-z0-9]+([a-z0-9]*|[._-]?[a-z0-9]+)*$/)
    .withMessage("Can start and finish with small letter, includes numbers, small letters and symbols('.', '_', '-')"),
  body(
    "password",
    "Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character",
  ).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/),
  oneOf([
    body("fullname", "Invalid full name")
      .optional()
      .matches(/^([a-zA-Z]{2,}\s[a-zA-Z]{1,}'?-?[a-zA-Z]{2,}\s?([a-zA-Z]{1,})?)/),
    body("fullname").isEmpty(),
  ]),
  body("avatarUrl", "Invalid URL").optional().isURL(),
];

export const loginValidation = [
  oneOf([
    body("login", "Invalid email").isEmail(),
    body("login", "Minimum two characters (a-z, 0-9, ._-)")
      .isLength({ min: 2 })
      .matches(/^[a-z0-9]+([a-z0-9]*|[._-]?[a-z0-9]+)*$/),
  ]),
  body(
    "password",
    "Minimum eight characters, at least one uppercase letter, one lowercase letter, one number and one special character",
  ).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/),
];

export const checkValidation = oneOf([
  body("email", "Invalid email").isEmail(),
  body("username")
    .isLength({ min: 2 })
    .withMessage("Minimum two characters")
    .matches(/^[a-z0-9]+([a-z0-9]*|[._-]?[a-z0-9]+)*$/)
    .withMessage("Can start and finish with small letter, includes numbers, small letters and symbols('.', '_', '-')"),
]);

export const postCreateValidation = [
  body("text", "Invalid text").optional().isString(),
  body("image", "Array of urls (1-10)").isArray({ min: 1, max: 10 }),
  body("image.*.url", "Invalid url").isURL(),
  body("image.*.id", "Invalid id").isString().isLength({min: 25})
];
