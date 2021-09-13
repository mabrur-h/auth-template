import pkg from "sequelize";
import moment from "moment";
import RN from 'random-number';
import { compareHash, createNewHash } from "../modules/bcrypt.js";
import { signJwtToken } from "../modules/jsonwebtoken.js";
import { Validations } from "../modules/validations.js";
const { Op } = pkg;

export default class UserController {
    static async UserCreateAccount(request, response, next) {
        try {
            const { name, phone, password } = await (
                await Validations.UserCreateAccountValidation()
            ).validateAsync(request.body);

            let userIsExist = await request.db.users.findOne({
                where: {
                    user_phone: {
                        [Op.iLike]: `%${phone}%`
                    }
                }
            });

            if (userIsExist?.dataValues.user_attempts > 0) {
                let ban = await request.db.bans.findOne({
                    where: {
                        user_id: userIsExist.dataValues.user_id,
                        expireDate: {
                            [Op.gt]: new Date()
                        }
                    }
                })

                if (ban) throw new response.error(403, `You have been banned until ${moment(ban.dataValues.expireDate)}`);

                const gen = RN.generator({
                    min: 10000,
                    max: 99999,
                    integer: true
                })

                const genNumber = gen()

                let attempt = await request.db.attempts.create({
                    user_code: genNumber,
                    user_id: userIsExist.dataValues.user_id
                })

                response.status(201).json({
                    ok: true,
                    message: "Successfully created!",
                    data: {
                        id: attempt.dataValues.attempt_id
                    }
                });
            } else {
                if (userIsExist) throw new response.error(400, "User already exists");

                let user = await request.db.users.create({
                    user_name: name,
                    user_phone: phone,
                    user_password: await createNewHash(password),
                });

                let ban = await request.db.bans.findOne({
                    where: {
                        user_id: user.dataValues.user_id,
                        expireDate: {
                            [Op.gt]: new Date()
                        }
                    }
                })

                if (ban) throw new response.error(403, `You have been banned until ${moment(ban.dataValues.expireDate)}`);

                const gen = RN.generator({
                    min: 10000,
                    max: 99999,
                    integer: true
                })

                const genNumber = gen()

                let attempt = await request.db.attempts.create({
                    user_code: genNumber,
                    user_id: user.user_id
                })

                response.status(201).json({
                    ok: true,
                    message: "Successfully created!",
                    data: {
                        id: attempt.dataValues.attempt_id
                    }
                });
            }

        } catch (error) {
            if (!error.statusCode)
                error = new response.error(400, "Invalid inputs");
            next(error);
        }
    }
    static async UserValidateCode(request, response, next) {
        try {
            let validationId = request.headers["code-validation-id"]

            if (!validationId) throw new response.error(404, "Invalid validation token");

            const attempt = await request.db.attempts.findOne({
                where: {
                    attempt_id: validationId
                },
                include: {
                    model: request.db.users,
                    attributes: {exclude: ["user_password"]}
                }
            })

            if (!attempt) throw new response.error(400, "Validation code is not found!");

            const { code } = await (
                await Validations.UserValidateCodeValidation()
            ).validateAsync(request.body);

            console.log(code)

            if (Number(code) !== Number(attempt.dataValues.user_code)) {
                const codeAttemptsVal = 3;
                const phoneAttemptsVal = 3;
                const banTime = 7200000;

                await request.db.attempts.update({
                    user_attempts: attempt.dataValues.user_attempts + 1
                }, {
                    where: {
                        attempt_id: validationId
                    }
                })

                if (Number(attempt.dataValues.user_attempts) > codeAttemptsVal - 1) {
                    await request.db.attempts.destroy({
                        where: {
                            attempt_id: validationId
                        }
                    })

                    await request.db.users.update({
                        user_attempts: attempt.dataValues.user.dataValues.user_attempts + 1
                    }, {
                        where: {
                            user_id: attempt.dataValues.user_id
                        }
                    })

                    if (Number(attempt.dataValues.user.dataValues.user_attempts) >= phoneAttemptsVal - 1) {
                        await request.db.users.update({
                            user_attempts: 0
                        }, {
                            where: {
                                user_id: attempt.dataValues.user_id
                            }
                        })

                        await request.db.bans.create({
                            user_id: attempt.dataValues.user_id,
                            expireDate: new Date(Date.now() + banTime)
                        })
                    }
                } throw new response.error(400, "you entered incorrect code!")
            }

            await request.db.sessions.destroy({
                where: {
                    user_id: attempt.dataValues.user_id
                }
            })

            let userAgent = request.headers['user-agent'];
            let ipAddress = request.headers["x-forwarded-for"] || request.connection.remoteAddress;

            if (!(userAgent && ipAddress)) throw new response.error(400, "Invalid device!")

            const session = await request.db.sessions.create({
                user_id: attempt.dataValues.user_id,
                session_inet: ipAddress,
                session_user_agent: userAgent
            });

            const token = await signJwtToken({
                session_id: session.dataValues.session_id,
            });

            await request.db.users.update({
                user_attempts: 0
            }, {
                where: {
                    user_id: attempt.dataValues.user_id
                }
            })

            await request.db.attempts.update({
                user_attempts: 0
            }, {
                where: {
                    user_id: attempt.dataValues.user_id
                }
            })

            await request.db.attempts.destroy({
                where: {
                    user_id: attempt.dataValues.user_id
                }
            });

            response.status(201).json({
                ok: true,
                message: "Successfully logged in!",
                data: {
                    token
                }
            })
        } catch (error) {
            if (!error.statusCode)
                error = new response.error(400, "Invalid inputs");
            next(error);
        }
    }
    static async UserLoginAccount(request, response, next) {
        try {
            const { phone, password } = await (
                await Validations.UserLoginAccountValidation()
            ).validateAsync(request.body);

            const user = await request.db.users.findOne({
                where: {
                    user_phone: phone,
                },
                raw: true,
            });

            if (!user) throw new response.error(400, "User Not found");

            const isTrust = await compareHash(password, user.user_password);

            if (!isTrust) {
                throw new response.error(400, "Password incorrect");
            }

            const user_ip =
                request.headers["x-forwarded-for"] ||
                request.socket.remoteAddress;
            const user_agent = request.headers["user-agent"];

            await request.db.sessions.destroy({
                where: {
                    [Op.and]: {
                        user_id: user.user_id,
                        session_inet: user_ip,
                        session_user_agent: user_agent,
                    },
                },
            });

            const session = await request.db.sessions.create({
                user_id: user.user_id,
                session_inet: user_ip,
                session_user_agent: user_agent,
            });

            const access_token = await signJwtToken({
                session_id: session.dataValues.session_id,
            });

            response.status(201).json({
                ok: true,
                message: "Successfully logged in",
                data: {
                    token: access_token,
                },
            });
        } catch (error) {
            console.log(error)
            if (!error.statusCode)
                error = new response.error(400, "Invalid inputs");
            next(error);
        }
    }
    static async UserGetMeAccount(request, response, next) {
        try {
            const user = await request.db.users.findOne({
                where: {
                    user_id: request.session.dataValues.user_id,
                },
                attributes: {exclude: ["user_attempts"]}
            });
            delete user.dataValues.user_password;
            response.json({
                ok: true,
                data: user.dataValues,
            });
        } catch (error) {
            if (!error.statusCode)
                error = new response.error(400, "Invalid inputs");
            next(error);
        }
    }
}