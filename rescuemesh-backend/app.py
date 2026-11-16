import logging

from flask import jsonify

from config import Config, validate_production_config
from extensions import cors, db, jwt, migrate
from routes import register_blueprints
from seed import seed_database

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def create_app(config_class=Config):
    from flask import Flask

    app = Flask(__name__)
    app.config.from_object(config_class)
    validate_production_config(app.config)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        supports_credentials=True,
    )

    register_blueprints(app)

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"error": "Authentication required"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"error": "Invalid session token"}), 401

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify({"error": "Session expired, please sign in again"}), 401

    @jwt.user_lookup_loader
    def _load_user(jwt_header, jwt_payload):
        from models.user import User

        return db.session.get(User, jwt_payload["sub"])

    @jwt.user_lookup_error_loader
    def _unknown_user(jwt_header, jwt_payload):
        return jsonify({"error": "Account no longer exists"}), 401

    @app.get("/")
    def root():
        return jsonify(
            {
                "service": "RescueMesh Backend",
                "stage": 2,
                "status": "online",
                "api": "/api/v1",
                "health": "/api/v1/system/health",
                "gateway_ingest": "POST /api/v1/sos",
            }
        )

    with app.app_context():
        import models  # noqa: F401

        db.create_all()
        if app.config.get("SEED_DEMO_DATA"):
            seed_database()

    if not app.config.get("GATEWAY_API_KEYS"):
        app.logger.warning(
            "GATEWAY_API_KEY is not set; POST /api/v1/sos will reject all gateway requests"
        )

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
