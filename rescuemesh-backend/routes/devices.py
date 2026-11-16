from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from models.device import Device

devices_bp = Blueprint("devices", __name__, url_prefix="/devices")


@devices_bp.get("")
@jwt_required()
def list_devices():
    devices = Device.query.order_by(Device.id.asc()).all()
    return jsonify([device.to_dict() for device in devices])


@devices_bp.get("/<device_id>")
@jwt_required()
def get_device(device_id: str):
    device = Device.query.get(device_id)
    if not device:
        return jsonify({"error": "Device not found"}), 404
    return jsonify(device.to_dict())
