import secrets
import string
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models.user import User

users_bp = Blueprint("users", __name__, url_prefix="/users")

VALID_ROLES = [
    "Administrator",
    "Emergency Operator",
    "Response Coordinator",
    "Viewer",
]


def _get_current_admin():
    """Verify that current caller is an authenticated, active Administrator."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.status == "Disabled":
        return None, (jsonify({"error": "Unauthorized or inactive account"}), 401)
    if user.role != "Administrator":
        return None, (jsonify({"error": "Administrator privilege required"}), 403)
    return user, None


@users_bp.get("")
@jwt_required()
def list_users():
    """List all registered user accounts. Accessible to authenticated personnel."""
    users = User.query.order_by(User.id.asc()).all()
    return jsonify([user.to_dict() for user in users])


@users_bp.get("/<user_id>")
@jwt_required()
def get_user(user_id: str):
    """Get single user profile details."""
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User account not found"}), 404
    return jsonify(user.to_dict())


@users_bp.post("")
@jwt_required()
def create_user():
    """Create a new user account (Admin only)."""
    admin, err = _get_current_admin()
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    role = (data.get("role") or "").strip()
    center = (data.get("station") or data.get("assignedDistrict") or "").strip()
    password = data.get("password") or ""

    if not name:
        return jsonify({"error": "Full Name is required"}), 400
    if not email or "@" not in email:
        return jsonify({"error": "A valid email address is required"}), 400
    if role not in VALID_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "A user with this email address already exists"}), 409

    generated = False
    if not password:
        alphabet = string.ascii_letters + string.digits
        password = "".join(secrets.choice(alphabet) for _ in range(12))
        generated = True
    elif len(password) < 6:
        return jsonify({"error": "Initial password must be at least 6 characters"}), 400

    # Generate sequential unique user ID (e.g., USR-050)
    count = User.query.count() + 1
    new_id = f"USR-{count:03d}"
    while User.query.get(new_id):
        count += 1
        new_id = f"USR-{count:03d}"

    badge_prefix = "ADMIN" if role == "Administrator" else "OPER" if role == "Emergency Operator" else "COORD" if role == "Response Coordinator" else "VIEW"
    badge_number = (data.get("badgeNumber") or f"RM-{badge_prefix}-{count:03d}").strip()
    assigned_location = center or "Disaster Emergency Command Center"

    new_user = User(
        id=new_id,
        name=name,
        email=email,
        role=role,
        badge_number=badge_number,
        assigned_district=assigned_location,
        station=assigned_location,
        station_id=admin.station_id or "DMC_WESTERN_HQ_01",
        status="Active",
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "user": new_user.to_dict(),
        "message": "User account created successfully",
        "generatedPassword": password if generated else None
    }), 201


@users_bp.patch("/<user_id>/role")
@jwt_required()
def update_user_role(user_id: str):
    """Change a user's role with safeguard for the last active administrator."""
    admin, err = _get_current_admin()
    if err:
        return err

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User account not found"}), 404

    data = request.get_json(silent=True) or {}
    new_role = (data.get("role") or "").strip()

    if new_role not in VALID_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}"}), 400

    if target_user.role == new_role:
        return jsonify({"user": target_user.to_dict(), "message": "Role is already set to this value"})

    # Safeguard: Protect the last active Administrator from being demoted
    if target_user.role == "Administrator" and new_role != "Administrator":
        active_admin_count = User.query.filter_by(role="Administrator", status="Active").count()
        if active_admin_count <= 1:
            return jsonify({
                "error": "Cannot change the role of the last active Administrator. At least one active Administrator must remain."
            }), 400

    target_user.role = new_role
    db.session.commit()

    return jsonify({
        "user": target_user.to_dict(),
        "message": f"Role updated to {new_role}"
    })


@users_bp.patch("/<user_id>/status")
@jwt_required()
def update_user_status(user_id: str):
    """Activate or deactivate a user account with last-admin safeguard."""
    admin, err = _get_current_admin()
    if err:
        return err

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User account not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = (data.get("status") or "").strip()

    if new_status not in ["Active", "Disabled"]:
        return jsonify({"error": "Status must be either 'Active' or 'Disabled'"}), 400

    # Safeguard: Protect the last active Administrator from being deactivated
    if target_user.role == "Administrator" and new_status == "Disabled":
        active_admin_count = User.query.filter_by(role="Administrator", status="Active").count()
        if active_admin_count <= 1:
            return jsonify({
                "error": "Cannot deactivate the last active Administrator. At least one active Administrator must remain."
            }), 400

    target_user.status = new_status
    db.session.commit()

    return jsonify({
        "user": target_user.to_dict(),
        "message": f"Account status set to {new_status}"
    })


@users_bp.post("/<user_id>/reset-password")
@jwt_required()
def reset_user_password(user_id: str):
    """Reset a user's password (Admin only)."""
    admin, err = _get_current_admin()
    if err:
        return err

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User account not found"}), 404

    data = request.get_json(silent=True) or {}
    new_password = data.get("password") or ""
    generated = False

    if not new_password:
        alphabet = string.ascii_letters + string.digits
        new_password = "".join(secrets.choice(alphabet) for _ in range(12))
        generated = True
    elif len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    target_user.set_password(new_password)
    db.session.commit()

    return jsonify({
        "message": "Password reset successfully",
        "temporaryPassword": new_password if generated else None
    })


@users_bp.patch("/<user_id>")
@jwt_required()
def update_user_profile(user_id: str):
    """Update basic user details (name, center/district)."""
    admin, err = _get_current_admin()
    if err:
        return err

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User account not found"}), 404

    data = request.get_json(silent=True) or {}
    if "name" in data and data["name"].strip():
        target_user.name = data["name"].strip()
    if "station" in data and data["station"].strip():
        target_user.station = data["station"].strip()
        target_user.assigned_district = data["station"].strip()
    if "assignedDistrict" in data and data["assignedDistrict"].strip():
        target_user.assigned_district = data["assignedDistrict"].strip()
        if not target_user.station:
            target_user.station = data["assignedDistrict"].strip()

    db.session.commit()
    return jsonify({
        "user": target_user.to_dict(),
        "message": "User details updated successfully"
    })
