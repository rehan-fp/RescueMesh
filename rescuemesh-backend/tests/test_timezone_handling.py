from datetime import datetime, timezone
import pytest
from services.incident_ingest import _parse_timestamp


def test_parse_timestamp_none_returns_utc_datetime():
    before = datetime.utcnow()
    res = _parse_timestamp(None)
    after = datetime.utcnow()
    assert isinstance(res, datetime)
    assert res.tzinfo is None
    assert before <= res <= after


def test_parse_timestamp_with_positive_offset():
    # 13:01:00 in +05:30 (Sri Lanka / India) is 07:31:00 UTC
    raw = "2026-11-15T13:01:00+05:30"
    res = _parse_timestamp(raw)
    assert res == datetime(2026, 11, 15, 7, 31, 0)
    assert res.tzinfo is None


def test_parse_timestamp_with_utc_z():
    raw = "2026-11-15T07:31:08Z"
    res = _parse_timestamp(raw)
    assert res == datetime(2026, 11, 15, 7, 31, 8)
    assert res.tzinfo is None


def test_parse_timestamp_with_naive_iso():
    raw = "2026-11-15T07:31:08"
    res = _parse_timestamp(raw)
    assert res == datetime(2026, 11, 15, 7, 31, 8)
    assert res.tzinfo is None


def test_parse_timestamp_datetime_object_with_tz():
    dt_with_tz = datetime(2026, 11, 15, 13, 1, 0, tzinfo=timezone.utc)
    res = _parse_timestamp(dt_with_tz)
    assert res == datetime(2026, 11, 15, 13, 1, 0)
    assert res.tzinfo is None

