import { authenticateWebhook } from "../src/webhook";
import { it, expect } from "vitest";
import dotenv from "dotenv";
dotenv.config();

const REQUEST_BODY = {
  event: { id: 5030, history_id: 2367, label: "webhook-2" },
  trigger: {
    id: null,
    type: 4,
    reason: "Manually Triggered",
    reason_long: "Manually Triggered by Brijesh Vishwanath",
    payload: {
      has_disabled_emails: false,
      trigger_type: 4,
      triggered_by_user_id: 1437,
      event_history_id: 2367,
    },
  },
  project: {
    uuid: "cf63f22e-e05d-44f3-a055-bb25fee9097f",
    project_number: "image-capture",
    project_name: "broad street",
    project_client: "datanest",
    project_type: 1,
    project_manager_uuid: "c45668cf-ff54-4657-857d-a05ee02a3afd",
    workflow_id: null,
    archived: false,
    is_confidential: false,
    is_confirmed: true,
    latitude: -43.5593438,
    longitude: 172.6866739,
    storage_needs_calc: true,
    storage_usage_mb: 0,
    has_soil_upload: false,
    has_water_upload: false,
    has_leachate_upload: false,
    has_soilgas_upload: false,
    has_sediment_upload: false,
    has_xrf_data: false,
    has_chemical_misalignment: false,
    has_sample_merging_misalignment: false,
    has_matrice_misalignment: false,
    has_unit_misalignment: false,
    has_rpd_misalignment: false,
    has_spatial_misalignment: false,
    is_gather_non_spatial_view: false,
    is_legacy_gather_table: true,
    project_address: "15 Broad Street, Woolston, Christchurch, New Zealand",
    google_place_id:
      "EjkxNSBCcm9hZCBTdHJlZXQsIFdvb2xzdG9uLCBDaHJpc3RjaHVyY2ggODAyMywgTmV3IFplYWxhbmQiMBIuChQKEgkXxisrfCcybRFMTSv_apNd3RAPKhQKEgkDFCgrfCcybREflxifi57j6Q",
    address_street: "15 Broad Street",
    address_locality: "Woolston",
    address_city: "Christchurch",
    address_state: "Canterbury",
    address_country: "NZ",
    address_postcode: "8023",
    measurement_type: "metre",
    timezone: "Pacific/Auckland",
    enviro_processed_at: null,
    updated_at: "2024-07-12T03:56:53.000000Z",
    created_at: "2024-07-08T22:23:50.000000Z",
  },
  workflow: null,
  project_link:
    "http://datanest.localhost:8080/p/cf63f22e-e05d-44f3-a055-bb25fee9097f",
  collection_link:
    "http://datanest.localhost:8080/p/cf63f22e-e05d-44f3-a055-bb25fee9097f?redirect=%2Fgather%3Fredirect%3Dcollection",
  item: null,
  file: null,
  document: null,
};

// Only used for unit testing the signature below, not a valid secret.
const secretKey = '2ccad589-ba74-4a0f-8914-aecb00e05816';

it("should authenticate webhook", async () => {
  const request = new Request(
    "https://webhook.site/cb397c76-85b3-4710-8935-9f30fb439774",
    {
      method: "POST",
      headers: {
        "X-Signature":
          "075acc1b30a33b753c247d39e0765a7ea107cb5086421ae05460427760464242",
        "X-Timestamp": "1720756735",
      },
      body: JSON.stringify(REQUEST_BODY),
    }
  );
  const result = await authenticateWebhook(request, secretKey, true);
  expect(result).toBe(true);
});

it("should not authenticate webhook: bad timestamp", async () => {
  const request = new Request(
    "https://webhook.site/cb397c76-85b3-4710-8935-9f30fb439774",
    {
      method: "POST",
      headers: {
        "X-Signature":
          "f653ea2d3aecd628c2484b489abc754faf66b380ad2e68285820bb7fde54976a",
        "X-Timestamp": "1720756735",
      },
      body: JSON.stringify(REQUEST_BODY),
    }
  );
  const result = await authenticateWebhook(request, secretKey, true);
  expect(result).toBe(false);
});

it("should not authenticate webhook: bad signature", async () => {
  const request = new Request(
    "https://webhook.site/cb397c76-85b3-4710-8935-9f30fb439774",
    {
      method: "POST",
      headers: {
        "X-Signature":
          "8b9dcd522db8757a5656a4819c269f6634f862f9460629f4d15fb17981dfda4e",
        "X-Timestamp": "1720756735",
      },
      body: JSON.stringify(REQUEST_BODY),
    }
  );
  const secretKey = "invalid-secret-key";
  const result = await authenticateWebhook(request, secretKey, true);
  expect(result).toBe(false);
});

it("should not authenticate webhook: old timestamp", async () => {
  const request = new Request(
    "https://webhook.site/cb397c76-85b3-4710-8935-9f30fb439774",
    {
      method: "POST",
      headers: {
        "X-Signature":
          "075acc1b30a33b753c247d39e0765a7ea107cb5086421ae05460427760464242",
        "X-Timestamp": "1720756735",
      },
      body: JSON.stringify(REQUEST_BODY),
    }
  );
  const [valid, invalid] = await Promise.all([
    authenticateWebhook(request, secretKey, true),
    authenticateWebhook(request, secretKey),
  ]);
  expect(valid).toBe(true);
  expect(invalid).toBe(false);
});

