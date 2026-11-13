
import json
from pathlib import Path

KEV_FILE = Path(__file__).resolve().parent.parent / "data" / "cisa_kev.json"


def lookup_cve(cve_id: str):
    """Find a CVE in the locally downloaded CISA KEV catalog."""

    cve_id = cve_id.strip().upper()

    if not cve_id.startswith("CVE-"):
        raise ValueError("Invalid CVE ID format.")

    if not KEV_FILE.exists():
        raise FileNotFoundError("CISA KEV dataset not found.")

    with KEV_FILE.open("r", encoding="utf-8") as file:
        catalog = json.load(file)

    for item in catalog.get("vulnerabilities", []):
        if item.get("cveID", "").upper() == cve_id:
            return {
                "found": True,
                "cve_id": item.get("cveID"),
                "vendor": item.get("vendorProject"),
                "product": item.get("product"),
                "vulnerability_name": item.get("vulnerabilityName"),
                "date_added": item.get("dateAdded"),
                "due_date": item.get("dueDate"),
                "known_ransomware_use": item.get(
                    "knownRansomwareCampaignUse"
                ),
                "cwes": item.get("cwes", []),
                "required_action": item.get("requiredAction"),
                "source": "CISA KEV"
            }

    return {
        "found": False,
        "cve_id": cve_id,
        "message": "CVE not found in the local CISA KEV catalog."
    }
