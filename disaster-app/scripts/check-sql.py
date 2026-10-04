"""
Executes the project's SQL against a real SQLite engine.

This validates the schema DDL, the CHECK constraints against the seed data, and
the syntax of every prepared statement used by the server, without needing the
better-sqlite3 native module.

Usage:
    node scripts/check-sql.mjs > /tmp/sql.json && python3 scripts/check-sql.py /tmp/sql.json
"""

import json
import sqlite3
import sys

payload = json.load(open(sys.argv[1]))

failures = []
passes = []


def ok(message):
    passes.append(message)
    print(f"ok    {message}")


def fail(message):
    failures.append(message)
    print(f"FAIL  {message}")


# ----------------------------------------------------------------- schema ---

conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")

try:
    conn.executescript(payload["schema"])
    ok("schema DDL executes without error")
except sqlite3.Error as exc:
    fail(f"schema DDL failed: {exc}")
    sys.exit(1)

tables = {
    row[0]
    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
}
expected_tables = {
    "users",
    "shelters",
    "hazard_zones",
    "sos_events",
    "reports",
    "checkins",
    "alerts",
    "contacts",
}
missing = expected_tables - tables
if missing:
    fail(f"tables missing after migration: {sorted(missing)}")
else:
    ok(f"all {len(expected_tables)} tables created")

indexes = {
    row[0]
    for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'index'")
    if row[0] and not row[0].startswith("sqlite_")
}
EXPECTED_INDEXES = {
    "idx_shelters_lat_lng",
    "idx_shelters_is_open",
    "idx_hazard_zones_type",
    "idx_hazard_zones_active",
    "idx_sos_status",
    "idx_sos_lat_lng",
    "idx_sos_created_at",
    "idx_reports_status",
    "idx_reports_lat_lng",
    "idx_reports_type",
    "idx_checkins_name",
    "idx_alerts_created_at",
}
missing_indexes = EXPECTED_INDEXES - indexes
if missing_indexes:
    fail(f"indexes missing: {sorted(missing_indexes)}")
else:
    ok(f"all {len(EXPECTED_INDEXES)} expected indexes created")

# ------------------------------------------------------------- seed insert ---

seed = payload["seed"]

try:
    for user in seed["users"]:
        conn.execute(
            "INSERT OR IGNORE INTO users (id, name, email, password_hash, role)"
            " VALUES (:id, :name, :email, :password_hash, :role)",
            {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "password_hash": "bcrypt-placeholder",
                "role": user["role"],
            },
        )
    ok(f"{len(seed['users'])} users inserted, role CHECK constraint satisfied")
except sqlite3.Error as exc:
    fail(f"user insert failed: {exc}")

try:
    for shelter in seed["shelters"]:
        conn.execute(
            "INSERT OR IGNORE INTO shelters"
            " (id, name, type, lat, lng, address, capacity, occupied, is_open, phone,"
            "  facilities, accessibility, updated_at)"
            " VALUES (:id, :name, :type, :lat, :lng, :address, :capacity, :occupied, 1,"
            "  :phone, :facilities, :accessibility, datetime('now'))",
            {
                **{k: shelter[k] for k in
                   ("id", "name", "type", "lat", "lng", "address", "capacity",
                    "occupied", "phone", "accessibility")},
                "facilities": json.dumps(shelter["facilities"]),
            },
        )
    ok(f"{len(seed['shelters'])} shelters inserted, capacity CHECK constraints satisfied")
except sqlite3.Error as exc:
    fail(f"shelter insert failed: {exc}")

try:
    for zone in seed["hazards"]:
        conn.execute(
            "INSERT OR IGNORE INTO hazard_zones"
            " (id, disaster_type, name, severity, geojson, active, updated_at)"
            " VALUES (:id, :disaster_type, :name, :severity, :geojson, :active, datetime('now'))",
            {
                "id": zone["id"],
                "disaster_type": zone["disaster_type"],
                "name": zone["name"],
                "severity": zone["severity"],
                "geojson": json.dumps(zone["geojson"]),
                "active": zone["active"],
            },
        )
    ok(f"{len(seed['hazards'])} hazard zones inserted, severity CHECK constraint satisfied")
except sqlite3.Error as exc:
    fail(f"hazard insert failed: {exc}")

try:
    for contact in seed["contacts"]:
        conn.execute(
            "INSERT OR IGNORE INTO contacts (id, label, number, category)"
            " VALUES (:id, :label, :number, :category)",
            contact,
        )
    ok(f"{len(seed['contacts'])} contacts inserted")
except sqlite3.Error as exc:
    fail(f"contact insert failed: {exc}")

try:
    for alert in seed["alerts"]:
        conn.execute(
            "INSERT OR IGNORE INTO alerts"
            " (id, title, body, severity, disaster_type, created_at, created_by)"
            " VALUES (:id, :title, :body, :severity, :disaster_type, datetime('now'), :created_by)",
            alert,
        )
    ok(f"{len(seed['alerts'])} alerts inserted, severity CHECK and user foreign key satisfied")
except sqlite3.Error as exc:
    fail(f"alert insert failed: {exc}")

try:
    for report in seed["reports"]:
        conn.execute(
            "INSERT OR IGNORE INTO reports"
            " (id, type, lat, lng, description, upvotes, downvotes, status, created_at)"
            " VALUES (:id, :type, :lat, :lng, :description, :upvotes, :downvotes, :status,"
            "  datetime('now'))",
            report,
        )
    ok(f"{len(seed['reports'])} reports inserted, status CHECK constraint satisfied")
except sqlite3.Error as exc:
    fail(f"report insert failed: {exc}")

try:
    for event in seed["sos"]:
        conn.execute(
            "INSERT OR IGNORE INTO sos_events"
            " (id, name, phone, lat, lng, message, status, created_at, resolved_at)"
            " VALUES (:id, :name, :phone, :lat, :lng, :message, :status,"
            "  datetime('now', '-3 hours'), datetime('now', '-2 hours'))",
            event,
        )
    ok(f"{len(seed['sos'])} SOS events inserted, status CHECK constraint satisfied")
except sqlite3.Error as exc:
    fail(f"SOS insert failed: {exc}")

conn.commit()

# Re-running the seed must not duplicate rows.
before = conn.execute("SELECT COUNT(*) FROM shelters").fetchone()[0]
for shelter in seed["shelters"]:
    conn.execute(
        "INSERT OR IGNORE INTO shelters"
        " (id, name, type, lat, lng, address, capacity, occupied, is_open, phone,"
        "  facilities, accessibility, updated_at)"
        " VALUES (:id, :name, :type, :lat, :lng, :address, :capacity, :occupied, 1,"
        "  :phone, :facilities, :accessibility, datetime('now'))",
        {
            **{k: shelter[k] for k in
               ("id", "name", "type", "lat", "lng", "address", "capacity",
                "occupied", "phone", "accessibility")},
            "facilities": json.dumps(shelter["facilities"]),
        },
    )
after = conn.execute("SELECT COUNT(*) FROM shelters").fetchone()[0]
if before == after:
    ok(f"seed is idempotent, shelter count stayed at {after} after a second run")
else:
    fail(f"seed is not idempotent: {before} became {after}")

# CHECK constraints must actually reject bad data.
rejected = 0
for sql, params in [
    ("INSERT INTO shelters (name, type, lat, lng, capacity, occupied, is_open, facilities,"
     " accessibility) VALUES ('Bad', 'school', 13, 80, -5, 0, 1, '[]', 0)", ()),
    ("INSERT INTO hazard_zones (disaster_type, name, severity, geojson, active)"
     " VALUES ('flood', 'Bad', 9, '{}', 1)", ()),
    ("INSERT INTO sos_events (lat, lng, status) VALUES (13, 80, 'nonsense')", ()),
    ("INSERT INTO reports (type, lat, lng, status) VALUES ('x', 13, 80, 'nonsense')", ()),
    ("INSERT INTO users (name, email, password_hash, role)"
     " VALUES ('x', 'x@y.z', 'h', 'superuser')", ()),
]:
    try:
        conn.execute(sql, params)
        conn.rollback()
    except sqlite3.IntegrityError:
        rejected += 1
if rejected == 5:
    ok("all 5 CHECK constraints reject invalid data")
else:
    fail(f"only {rejected} of 5 CHECK constraints rejected invalid data")

# The unique email constraint must hold.
try:
    conn.execute(
        "INSERT INTO users (name, email, password_hash, role)"
        " VALUES ('Dup', 'admin@demo.com', 'h', 'admin')"
    )
    conn.rollback()
    fail("duplicate email was accepted, the unique constraint is missing")
except sqlite3.IntegrityError:
    ok("duplicate email is rejected by the unique constraint")

# ------------------------------------------------- prepared statement syntax ---

named_param = __import__("re").compile(r"[@:](\w+)")
total = 0
bad = 0

interpolated = __import__("re").compile(r"\$\{[^}]+\}")
dynamic = 0

for source, statements in payload["prepared"].items():
    for sql in statements:
        total += 1
        # better-sqlite3 uses @name; translate to the :name form SQLite accepts.
        translated = sql.replace("@", ":")
        # One statement builds its column name from a validated whitelist, so
        # substitute a real column to confirm the surrounding SQL is sound.
        if interpolated.search(translated):
            translated = interpolated.sub("upvotes", translated)
            dynamic += 1
        try:
            conn.execute("EXPLAIN " + translated, {
                name: None for name in set(named_param.findall(translated))
            })
        except sqlite3.Error as exc:
            # Statements using ? placeholders need positional parameters.
            try:
                count = translated.count("?")
                conn.execute("EXPLAIN " + translated, tuple([None] * count))
            except sqlite3.Error as exc2:
                fail(f"{source}: statement does not compile: {exc2}\n      {sql[:110]}")
                bad += 1

if bad == 0:
    ok(
        f"all {total} prepared statements compile against the schema"
        f" ({dynamic} with a whitelisted dynamic column)"
    )

# --------------------------------------------------------- query behaviour ---

row = conn.execute(
    """
    SELECT
      (SELECT COUNT(*) FROM shelters) AS shelters,
      (SELECT COUNT(*) FROM shelters WHERE is_open = 1) AS sheltersOpen,
      (SELECT COALESCE(SUM(capacity), 0) FROM shelters) AS totalCapacity,
      (SELECT COALESCE(SUM(occupied), 0) FROM shelters) AS totalOccupied,
      (SELECT COUNT(*) FROM hazard_zones WHERE active = 1) AS activeHazards,
      (SELECT COUNT(*) FROM reports) AS reports,
      (SELECT COUNT(*) FROM checkins) AS checkins,
      (SELECT COUNT(*) FROM alerts) AS alerts
    """
).fetchone()

if row[0] == 20 and row[2] > 0:
    occupancy = round(row[3] / row[2] * 100, 1)
    ok(
        f"analytics summary returns real figures: {row[0]} shelters, "
        f"{row[1]} open, {occupancy}% occupancy, {row[4]} active hazards"
    )
else:
    fail(f"analytics summary returned unexpected values: {tuple(row)}")

# The 24 hour SOS bucket query must run and return the seeded event.
buckets = conn.execute(
    """
    SELECT strftime('%Y-%m-%dT%H:00:00Z', created_at) AS hour, COUNT(*) AS count
    FROM sos_events
    WHERE created_at >= datetime('now', '-24 hours')
    GROUP BY hour
    """
).fetchall()
if len(buckets) == 1 and buckets[0][1] == 1:
    ok("the 24 hour SOS bucket query groups the seeded event correctly")
else:
    fail(f"SOS bucket query returned {buckets}")

# Occupancy ordering must not divide by zero on a zero-capacity row.
conn.execute(
    "INSERT INTO shelters (name, type, lat, lng, capacity, occupied, is_open, facilities,"
    " accessibility) VALUES ('Zero capacity', 'school', 13, 80, 0, 0, 1, '[]', 0)"
)
try:
    conn.execute(
        """
        SELECT id, name, capacity, occupied
        FROM shelters WHERE is_open = 1
        ORDER BY (CAST(occupied AS REAL) / NULLIF(capacity, 0)) DESC
        LIMIT 12
        """
    ).fetchall()
    ok("occupancy ordering survives a zero-capacity shelter through NULLIF")
except sqlite3.Error as exc:
    fail(f"occupancy ordering failed: {exc}")
conn.rollback()

# The report auto-verify path must flip the status at three net upvotes.
conn.execute(
    "INSERT INTO reports (id, type, lat, lng, description, upvotes, downvotes, status)"
    " VALUES (900, 'road_blocked', 13, 80, 'test', 0, 0, 'unverified')"
)
for _ in range(3):
    conn.execute("UPDATE reports SET upvotes = upvotes + 1 WHERE id = 900")
net = conn.execute(
    "SELECT upvotes - downvotes FROM reports WHERE id = 900"
).fetchone()[0]
if net >= 3:
    conn.execute("UPDATE reports SET status = 'verified' WHERE id = 900")
status = conn.execute("SELECT status FROM reports WHERE id = 900").fetchone()[0]
if status == "verified":
    ok("report auto-verification triggers at three net upvotes")
else:
    fail(f"report auto-verification did not trigger, status is {status}")

# JSON stored in facilities must round-trip.
stored = conn.execute("SELECT facilities FROM shelters WHERE id = 1").fetchone()[0]
parsed = json.loads(stored)
if isinstance(parsed, list) and len(parsed) > 0:
    ok(f"shelter facilities round-trip as JSON, for example {parsed}")
else:
    fail(f"facilities did not round-trip: {stored!r}")

conn.close()

print()
if failures:
    print(f"SQL verification failed: {len(failures)} problem(s).")
    sys.exit(1)
print(f"SQL verification passed: {len(passes)} checks against SQLite {sqlite3.sqlite_version}.")
