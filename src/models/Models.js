export default class Models {
    static async UserModel(sequelize, Sequelize) {
        return sequelize.define("users", {
            user_id: {
                type: Sequelize.DataTypes.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            user_name: {
                type: Sequelize.DataTypes.STRING(32),
                allowNull: false,
                validate: {
                    isAlpha: true,
                },
            },
            user_password: {
                type: Sequelize.DataTypes.STRING(64),
                allowNull: false,
            },
            user_phone: {
                type: Sequelize.DataTypes.STRING(13),
                is: /^9989[012345789][0-9]{7}$/,
                allowNull: false,
                unique: true
            },
            user_role: {
                type: Sequelize.DataTypes.ENUM,
                values: ["superadmin", "admin", "user"],
                defaultValue: "user",
            },
            user_attempts: {
                type: Sequelize.DataTypes.SMALLINT,
                allowNull: false,
                defaultValue: 0
            }
        });
    }
    static async SessionModel(sequelize, Sequelize) {
        return sequelize.define("sessions", {
            session_id: {
                type: Sequelize.DataTypes.UUID,
                primaryKey: true,
                defaultValue: Sequelize.DataTypes.UUIDV4,
            },
            session_inet: {
                type: Sequelize.DataTypes.INET,
                allowNull: false,
            },
            session_user_agent: {
                type: Sequelize.DataTypes.STRING(128),
                allowNull: false,
            },
        });
    }
    static async BanModel(sequelize, Sequelize) {
        return sequelize.define("bans", {
            ban_id: {
                type: Sequelize.DataTypes.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            expireDate: {
                type: Sequelize.DataTypes.DATE,
                allowNull: false
            }
        })
    };
    static async AttemptsModel(sequelize, Sequelize) {
        return sequelize.define("attempts", {
            attempt_id: {
                type: Sequelize.DataTypes.UUID,
                primaryKey: true,
                defaultValue: Sequelize.UUIDV4,
            },
            user_code: {
                type: Sequelize.DataTypes.STRING(6),
                allowNull: true
            },
            user_attempts: {
                type: Sequelize.DataTypes.SMALLINT,
                allowNull: false,
                defaultValue: 0
            },
            isExpired: {
                type: Sequelize.DataTypes.BOOLEAN,
                defaultValue: false
            }
        })
    }
    static async Relations(db) {
        await db.users.hasMany(db.sessions, {
            foreignKey: {
                name: "user_id",
                allowNull: false,
            },
        });
        await db.sessions.belongsTo(db.users, {
            foreignKey: {
                name: "user_id",
                allowNull: false,
            },
        });
        await db.users.hasMany(db.attempts, {
            foreignKey: {
                name: "user_id",
                allowNull: false
            }
        });
        await db.attempts.belongsTo(db.users, {
            foreignKey: {
                name: "user_id",
                allowNull: false
            }
        });
        await db.users.hasMany(db.bans, {
            foreignKey: {
                name: "user_id",
                allowNull: false
            }
        });
        await db.bans.belongsTo(db.users, {
            foreignKey: {
                name: "user_id",
                allowNull: false
            }
        })
    }
}