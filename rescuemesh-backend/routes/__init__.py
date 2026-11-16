from flask import Blueprint

from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.devices import devices_bp
from routes.events import events_bp
from routes.incidents import incidents_bp
from routes.sos import sos_bp
from routes.system import system_bp
from routes.teams import teams_bp
from routes.testing import testing_bp
from routes.users import users_bp


def register_blueprints(app):
    api = Blueprint("api", __name__, url_prefix="/api/v1")
    api.register_blueprint(auth_bp)
    api.register_blueprint(events_bp)
    api.register_blueprint(incidents_bp)
    api.register_blueprint(teams_bp)
    api.register_blueprint(devices_bp)
    api.register_blueprint(users_bp)
    api.register_blueprint(dashboard_bp)
    api.register_blueprint(system_bp)
    api.register_blueprint(testing_bp)
    api.register_blueprint(sos_bp)
    app.register_blueprint(api)
