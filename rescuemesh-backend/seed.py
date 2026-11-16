"""Seed Stage 1 demo data matching the existing frontend mock dataset."""

from datetime import datetime, timedelta

from extensions import db
from models.device import Device
from models.incident import Incident
from models.rescue_team import RescueTeam
from models.timeline import TimelineEntry
from models.user import User
from services.geocoding_service import reverse_geocode
from services.priority_service import calculate_ai_priority


DEFAULT_PASSWORD = "rescuemesh123"


def _dt_today(hour: int, minute: int) -> datetime:
    now = datetime.utcnow()
    return now.replace(hour=hour, minute=minute, second=0, microsecond=0)


def ensure_admin_user() -> None:
    admin = User.query.filter_by(email="rescumeshadmin@gmail.com").first()
    if not admin:
        admin = User(
            id="USR-001",
            name="RescueMesh Administrator",
            email="rescumeshadmin@gmail.com",
            role="Administrator",
            badge_number="ADMIN-001",
            assigned_district="National Command Center",
            station="Disaster Management Center HQ",
            station_id="DMC_WESTERN_HQ_01",
            status="Active",
        )
        admin.set_password("rescumesh@2026")
        db.session.add(admin)
        db.session.commit()


def seed_database(force: bool = False) -> None:
    if User.query.first() and not force:
        return

    if force:
        TimelineEntry.query.delete()
        Incident.query.delete()
        Device.query.delete()
        RescueTeam.query.delete()
        User.query.delete()
        db.session.commit()

    users = [
        User(
            id="USR-001",
            name="RescueMesh Administrator",
            email="rescumeshadmin@gmail.com",
            role="Administrator",
            badge_number="ADMIN-001",
            assigned_district="National Command Center",
            station="Disaster Management Center HQ",
            station_id="DMC_WESTERN_HQ_01",
            status="Active",
            last_login=_dt_today(20, 30),
        ),
        User(
            id="USR-042",
            name="Fernando M N",
            email="fernando.op@rescuemesh.gov.lk",
            role="Emergency Operator",
            badge_number="RM-OPER-004",
            assigned_district="Western Province (Kelani River Basin)",
            station="Disaster Emergency Command Center",
            station_id="DMC_WESTERN_HQ_01",
            status="On Duty",
            last_login=_dt_today(20, 30),
            avatar_url=(
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb"
                "?w=120&auto=format&fit=crop&q=80"
            ),
        ),
        User(
            id="USR-010",
            name="Dr. Rohan Perera",
            email="rohan.perera@disastermgmt.gov.lk",
            role="Administrator",
            badge_number="DIR-001",
            assigned_district="National Command Center",
            station="Disaster Management Center HQ",
            station_id="DMC_WESTERN_HQ_01",
            status="Active",
            last_login=_dt_today(19, 15),
        ),
        User(
            id="USR-025",
            name="Capt. Sarah Alwis",
            email="sarah.alwis@navy.rescuemesh.lk",
            role="Response Coordinator",
            badge_number="COORD-104",
            assigned_district="Kelani Basin Tactical Command",
            station="Kelaniya Forward Staging Base",
            station_id="DMC_WESTERN_HQ_01",
            status="On Duty",
            last_login=_dt_today(20, 10),
        ),
        User(
            id="USR-088",
            name="Kavinda Jayasuriya",
            email="kavinda.j@redcross.lk",
            role="Viewer",
            badge_number="OBS-892",
            assigned_district="Western Province Sector 3",
            station="Western Sector Observation Terminal",
            station_id="DMC_WESTERN_HQ_01",
            status="Active",
            last_login=_dt_today(18, 40),
        ),
    ]
    for user in users:
        if user.email == "rescumeshadmin@gmail.com":
            user.set_password("rescumesh@2026")
        else:
            user.set_password(DEFAULT_PASSWORD)
        db.session.add(user)

    teams = [
        RescueTeam(
            id="TEAM-01",
            name="Medical Response Team 01",
            type="Medical",
            status="Assigned",
            current_incident_id="RM-00188",
            current_incident_code="RM-00188",
            base_location="Kelaniya Base Hospital Staging Post",
            latitude=7.2015,
            longitude=79.8402,
            completed_incidents_today=8,
            last_update="2 mins ago",
            contact_phone="+94 77 123 4501",
            team_lead="Dr. H. M. Wickramasinghe",
            current_assignments_count=1,
        ),
        RescueTeam(
            id="TEAM-02",
            name="Rescue Team 02 (Navy Boat Unit)",
            type="Boat Rescue",
            status="Assigned",
            current_incident_id="RM-00185",
            current_incident_code="RM-00185",
            base_location="Sedawatta River Jetty",
            latitude=7.2150,
            longitude=79.8290,
            completed_incidents_today=12,
            last_update="4 mins ago",
            contact_phone="+94 77 123 4502",
            team_lead="Lt. Cmdr. T. Silva",
            current_assignments_count=1,
        ),
        RescueTeam(
            id="TEAM-03",
            name="Rescue Team 03 (Swift Water Ops)",
            type="Boat Rescue",
            status="Available",
            base_location="Peliyagoda Tactical Base",
            latitude=7.2280,
            longitude=79.8510,
            completed_incidents_today=7,
            last_update="6 mins ago",
            contact_phone="+94 77 123 4503",
            team_lead="Chief Insp. R. Bandara",
            current_assignments_count=0,
        ),
        RescueTeam(
            id="TEAM-04",
            name="Disaster Supply Unit 04",
            type="Supply Logistics",
            status="In Progress",
            current_incident_id="RM-00186",
            current_incident_code="RM-00186",
            base_location="Wattala Disaster Logistics Hub",
            latitude=7.2410,
            longitude=79.8210,
            completed_incidents_today=5,
            last_update="9 mins ago",
            contact_phone="+94 77 123 4504",
            team_lead="Logistics Off. A. Fonseka",
            current_assignments_count=1,
        ),
        RescueTeam(
            id="TEAM-05",
            name="Army Evacuation Squad 05",
            type="General Evacuation",
            status="In Progress",
            current_incident_id="RM-00189",
            current_incident_code="RM-00189",
            base_location="Gampaha District Secretariat Post",
            latitude=7.2190,
            longitude=79.8650,
            completed_incidents_today=14,
            last_update="11 mins ago",
            contact_phone="+94 77 123 4505",
            team_lead="Capt. N. Senanayake",
            current_assignments_count=1,
        ),
        RescueTeam(
            id="TEAM-06",
            name="Shelter & Relief Squad 06",
            type="Supply Logistics",
            status="Available",
            base_location="Kolonnawa Community Center",
            latitude=7.1950,
            longitude=79.8450,
            completed_incidents_today=4,
            last_update="15 mins ago",
            contact_phone="+94 77 123 4506",
            team_lead="Coordinator Priyantha D.",
            current_assignments_count=0,
        ),
        RescueTeam(
            id="TEAM-07",
            name="Aero-Rescue Support 07",
            type="General Evacuation",
            status="Offline",
            base_location="Ratmalana Air Base (Standby)",
            latitude=7.1700,
            longitude=79.8300,
            completed_incidents_today=3,
            last_update="45 mins ago",
            contact_phone="+94 77 123 4507",
            team_lead="Sq. Ldr. K. Mendis",
            current_assignments_count=0,
        ),
    ]
    db.session.add_all(teams)

    devices = [
        Device(
            id="GATEWAY_001",
            name="ESP32 LoRa Gateway - Kelaniya Central",
            type="ESP32 LoRa Gateway",
            status="Online",
            last_seen="Now",
            firmware="v2.4.1-Rel",
            gateway="Direct (Wi-Fi HTTPS Uplink)",
            rssi_dbm=-78,
            snr_db=9.2,
            signal_strength="-78 dBm (Excellent)",
            latitude=7.2105,
            longitude=79.8390,
            location="Kelaniya Telecommunication Station",
            packets_transmitted=14890,
            frequency_band="433 MHz",
        ),
        Device(
            id="GATEWAY_002",
            name="ESP32 LoRa Gateway - Sedawatta Hill",
            type="ESP32 LoRa Gateway",
            status="Online",
            last_seen="1 min ago",
            firmware="v2.4.1-Rel",
            gateway="Direct (Wi-Fi HTTPS Uplink)",
            rssi_dbm=-82,
            snr_db=8.4,
            signal_strength="-82 dBm (Good)",
            latitude=7.2210,
            longitude=79.8250,
            location="Sedawatta High Water Observation Mast",
            packets_transmitted=9420,
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_001",
            name="Community Emergency Node #001",
            type="Community Emergency Node",
            status="Online",
            last_seen="2 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_001",
            rssi_dbm=-88,
            snr_db=7.1,
            signal_strength="-88 dBm (Good)",
            latitude=7.2083,
            longitude=79.8358,
            location="Taladuwa, Negombo, Gampaha District",
            packets_transmitted=412,
            last_incident_id="RM-00184",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_002",
            name="Community Emergency Node #002",
            type="Community Emergency Node",
            status="Online",
            last_seen="4 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_001",
            rssi_dbm=-94,
            snr_db=6.0,
            signal_strength="-94 dBm (Moderate)",
            latitude=7.2162,
            longitude=79.8310,
            location="Grandpass North Lowlands",
            packets_transmitted=388,
            last_incident_id="RM-00185",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_003",
            name="Community Emergency Node #003",
            type="Community Emergency Node",
            status="Online",
            last_seen="7 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_002",
            rssi_dbm=-90,
            snr_db=6.8,
            signal_strength="-90 dBm (Good)",
            latitude=7.2340,
            longitude=79.8450,
            location="Gampaha Riverbank Sector A",
            packets_transmitted=275,
            last_incident_id="RM-00186",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_004",
            name="Community Emergency Node #004",
            type="Community Emergency Node",
            status="Online",
            last_seen="14 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_002",
            rssi_dbm=-101,
            snr_db=4.2,
            signal_strength="-101 dBm (Fair)",
            latitude=7.2270,
            longitude=79.8180,
            location="Wattala Coastal Plain",
            packets_transmitted=190,
            last_incident_id="RM-00187",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_005",
            name="Community Emergency Node #005",
            type="Community Emergency Node",
            status="Online",
            last_seen="22 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_001",
            rssi_dbm=-86,
            snr_db=7.5,
            signal_strength="-86 dBm (Good)",
            latitude=7.2020,
            longitude=79.8490,
            location="Kolonnawa Canal Inflow Gate",
            packets_transmitted=1240,
            last_incident_id="RM-00188",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_006",
            name="Community Emergency Node #006",
            type="Community Emergency Node",
            status="Recently Seen",
            last_seen="28 min ago",
            firmware="v1.8.0",
            gateway="GATEWAY_002",
            rssi_dbm=-109,
            snr_db=2.1,
            signal_strength="-109 dBm (Weak)",
            latitude=7.2480,
            longitude=79.8580,
            location="Biyagama Industrial Zone Edge",
            packets_transmitted=154,
            last_incident_id="RM-00189",
            frequency_band="433 MHz",
        ),
        Device(
            id="NODE_007",
            name="Community Emergency Node #007",
            type="Community Emergency Node",
            status="Offline",
            last_seen="2 hours ago",
            firmware="v1.7.5",
            gateway="GATEWAY_001",
            rssi_dbm=-120,
            snr_db=0,
            signal_strength="No Signal",
            latitude=7.1910,
            longitude=79.8220,
            location="Wellampitiya Bridge Outpost",
            packets_transmitted=98,
            frequency_band="433 MHz",
        ),
    ]
    db.session.add_all(devices)
    db.session.flush()

    sample_incidents = [
        ("RM-00184", "NODE_001", "Medical", "High", 7.2083, 79.8358,
         "Taladuwa, Negombo, Gampaha District", 20, 45, "New", 6, 2, None, None),
        ("RM-00185", "NODE_002", "Rescue", "High", 7.2162, 79.8310,
         "Grandpass North Lowlands", 20, 41, "Assigned", 4, 6, "TEAM-02",
         "Rescue Team 02 (Navy Boat Unit)"),
        ("RM-00186", "NODE_003", "Food & Water", "High", 7.2340, 79.8450,
         "Gampaha Riverbank Sector A", 20, 37, "In Progress", 3, 10, "TEAM-04",
         "Disaster Supply Unit 04"),
        ("RM-00187", "NODE_004", "Shelter", "Medium", 7.2270, 79.8180,
         "Wattala Coastal Plain", 20, 29, "Acknowledged", 1, 18, None, None),
        ("RM-00188", "NODE_005", "Medical", "High", 7.2020, 79.8490,
         "Kolonnawa Canal Inflow Gate", 20, 22, "Assigned", 5, 25, "TEAM-01",
         "Medical Response Team 01"),
        ("RM-00189", "NODE_006", "Rescue", "Medium", 7.2480, 79.8580,
         "Biyagama Industrial Zone Edge", 20, 15, "In Progress", 2, 32, "TEAM-05",
         "Army Evacuation Squad 05"),
        ("RM-00190", "NODE_002", "Food & Water", "Medium", 7.2190, 79.8520,
         "Sedawatta East Highground", 20, 4, "Resolved", 1, 43, "TEAM-06",
         "Shelter & Relief Squad 06"),
        ("RM-00191", "NODE_001", "Shelter", "Low", 7.1950, 79.8450,
         "Kolonnawa Community Perimeter", 19, 48, "Resolved", 0, 59, "TEAM-06",
         "Shelter & Relief Squad 06"),
        ("RM-00192", "NODE_003", "Medical", "High", 7.2110, 79.8280,
         "Peliyagoda Market Flood Basin", 19, 35, "Resolved", 4, 72, "TEAM-01",
         "Medical Response Team 01"),
    ]

    for (
        incident_id,
        device_id,
        category,
        risk_zone,
        lat,
        lng,
        location_name,
        hour,
        minute,
        status,
        nearby,
        age,
        team_id,
        team_name,
    ) in sample_incidents:
        priority, factors = calculate_ai_priority(category, risk_zone, nearby, age)
        received_at = _dt_today(hour, minute)
        resolved = reverse_geocode(lat, lng)
        real_location_name = resolved.location_name if resolved.location_name != "Location unavailable" else location_name
        resolved_at = datetime.utcnow() if resolved.location_name != "Location unavailable" else None
        incident = Incident(
            id=incident_id,
            device_id=device_id,
            gateway_id="GATEWAY_001",
            category=category,
            latitude=lat,
            longitude=lng,
            location_name=real_location_name,
            locality=resolved.locality,
            district=resolved.district,
            location_resolved_at=resolved_at,
            risk_zone=risk_zone,
            nearby_sos_count=nearby,
            ai_recommended_priority=priority,
            operational_priority=priority,
            priority_source=factors.get("predictionSource"),
            ai_model=factors.get("aiModel"),
            ai_prediction_timestamp=datetime.utcnow(),
            sequence_number=int(incident_id.replace("RM-", "")),
            status=status,
            assigned_team_id=team_id if status != "Resolved" else team_id,
            received_at=received_at,
            acknowledged_at=received_at + timedelta(minutes=2) if status != "New" else None,
            assigned_at=received_at + timedelta(minutes=5)
            if status in ("Assigned", "In Progress", "Resolved")
            else None,
            in_progress_at=received_at + timedelta(minutes=17)
            if status in ("In Progress", "Resolved")
            else None,
            resolved_at=received_at + timedelta(minutes=45) if status == "Resolved" else None,
            rssi_dbm=-88,
            snr_db=7.4,
        )
        incident.set_ai_priority_factors(factors)

        timeline = [
            TimelineEntry(
                status="New",
                timestamp=f"{hour:02d}:{minute:02d}",
                operator="Emergency System",
                note=f"Emergency request received. Recommended Priority: {priority}.",
            )
        ]
        if status != "New":
            timeline.append(
                TimelineEntry(
                    status="Acknowledged",
                    timestamp="20:47",
                    operator="Fernando M N",
                    note="Incident acknowledged and placed in rescue queue.",
                )
            )
        if status in ("Assigned", "In Progress", "Resolved"):
            timeline.append(
                TimelineEntry(
                    status="Assigned",
                    timestamp="20:50",
                    operator="Fernando M N",
                    note=f"Dispatched {team_name or 'Rescue Team'}.",
                )
            )
        if status in ("In Progress", "Resolved"):
            timeline.append(
                TimelineEntry(
                    status="In Progress",
                    timestamp="21:02",
                    operator=team_name or "Team Lead",
                    note="Rescue unit reached coordinates. Operational assistance underway.",
                )
            )
        if status == "Resolved":
            timeline.append(
                TimelineEntry(
                    status="Resolved",
                    timestamp="21:30",
                    operator="Fernando M N",
                    note=(
                        "Assistance request completed. Affected group moved to "
                        "higher-ground relief shelter. Incident closed."
                    ),
                )
            )

        incident.timeline_entries = timeline
        db.session.add(incident)

    db.session.commit()
    print("Seeded RescueMesh Stage 1 demo data.")
    print(f"Demo login password for all users: {DEFAULT_PASSWORD}")
