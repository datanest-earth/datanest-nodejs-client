
## Data Event Webhooks

In the Datanest Web application, you can configure Data Event "Webhook Actions". These can be triggered by a number of 'Triggers' such as Gather App items (custom form data) being created, modified, a Gather Public Form is submitted, or when an Auto Doc file is marked finalized. More triggers are being added all the time.

You can add a "Send Webhook" Action to a data event to notify an external system of some event that has occurred in Datanest. This can be used to trigger a workflow in another system, or to send data to another system such as a third party API.

![](./images/data-event-webhook-configuration.png)

You can [learn more about Data Events here](https://app.datanest.earth/support/4). Or [contact us](https://www.datanest.earth/contact-us) to learn more about our customization services.

## Example Data Event

![](./images/data-event-complex-example.png)

## Webhook Payloads

<details>
<summary>Example 1: Gather App Item Updated or Created</summary>

```json
{
    "event": {
        "id": 37,
        "history_id": 333,
        "label": "Claim Completed"
    },
    "trigger": {
        "id": 139,
        "type": 2,
        "reason": "App Item Updated",
        "reason_long": "App Item Updated",
        "payload": {
            "item_id": 1128954,
            "trigger_type": 2,
            "trigger_id": 139,
            "event_history_id": 333
        }
    },
    "project": {
        "uuid": "005056a4-ecd7-4ded-87bc-dad952efe1a5",
        "project_number": "Data Event Webhooks",
        "project_name": "Sopoline Burton",
        "project_client": "Tempor do aliquid no",
        "project_type": 1,
        "project_manager_uuid": "b4d84c46-1513-42ac-9d9f-dd56fa3d853c",
        "archived": false,
        "is_confidential": false,
        "is_confirmed": true,
        "latitude": 40.7094756,
        "longitude": -74.0072955,
        "storage_needs_calc": true,
        "storage_usage_mb": 0,
        "has_soil_upload": false,
        "has_water_upload": false,
        "has_leachate_upload": false,
        "has_soilgas_upload": false,
        "has_xrf_data": false,
        "has_chemical_misalignment": false,
        "has_sample_merging_misalignment": false,
        "has_matrice_misalignment": false,
        "has_unit_misalignment": false,
        "has_rpd_misalignment": false,
        "has_spatial_misalignment": false,
        "is_gather_non_spatial_view": false,
        "is_legacy_gather_table": true,
        "project_address": "123 William Street, New York, NY, USA",
        "google_place_id": "ChIJIaGbBBhawokRUmbgNsUmr-s",
        "address_street": "123 William Street",
        "address_locality": "Manhattan",
        "address_city": "New York",
        "address_state": "New York",
        "address_country": "United States",
        "address_postcode": "10038",
        "measurement_type": "inch",
        "timezone": "America\/Los_Angeles",
        "enviro_processed_at": null,
        "updated_at": "2024-01-26T01:25:34.000000Z",
        "created_at": "2024-01-24T03:48:57.000000Z"
    },
    "project_link": "http:\/\/datanest.localhost:8080\/open-project\/005056a4-ecd7-4ded-87bc-dad952efe1a5",
    "item": {
        "id": 1128954,
        "project_uuid": "005056a4-ecd7-4ded-87bc-dad952efe1a5",
        "app_uuid": "d0b47e4b-6b98-4b77-aee4-2b02a25898ec",
        "type": 3,
        "title": "Test",
        "lab_title": null,
        "original_title": null,
        "latitude": 40.7094756,
        "longitude": -74.0072955,
        "label_title": null,
        "sample_type": 3,
        "hidden": false,
        "icon_size": null,
        "label_position": "{\"lat\": null, \"lng\": null}",
        "is_label_hidden": 0,
        "label_color": null,
        "label_shadow_color": null,
        "label_size": null,
        "is_label_underlined": null,
        "is_label_asterisk_appended": null,
        "marker_type": 0,
        "enviro_start_depth": null,
        "enviro_end_depth": null,
        "enviro_soil_description": null,
        "enviro_lab_sample_type": null,
        "enviro_sampled_date": null,
        "enviro_analyzed_date": null,
        "enviro_duplicate_of_id": null,
        "enviro_triplicate_of_id": null,
        "enviro_composite_of": null,
        "enviro_matrix": 0,
        "created_at": "2024-01-25T00:20:28.000000Z",
        "updated_at": "2024-01-25T00:20:28.000000Z",
        "deleted_at": null
    },
    "file": null,
    "document": null
}
```
</details>

<details>
<summary>Example 2: Document Finalized</summary>

When a `file` is provided, there will be `temporary_s3_link` with a 10 minute expiration to download the file.
The file, document and project `link`s are for the Datanest web application intended for end-users.

```json
{
    "event": {
        "id": 39,
        "history_id": 342,
        "label": "Finalized test"
    },
    "trigger": {
        "id": 143,
        "type": 6,
        "reason": "Auto Doc Finalized",
        "reason_long": "Auto Doc Finalized",
        "payload": {
            "trigger_id": 143,
            "trigger_type": 6,
            "document_id": 5113,
            "file_id": "9b2e7091-22bc-4a25-b9d7-d6701a50387a",
            "event_history_id": 342
        }
    },
    "project": {
        "uuid": "005056a4-ecd7-4ded-87bc-dad952efe1a5",
        "project_number": "Data Event Webhooks",
        "project_name": "Sopoline Burton",
        "project_client": "Tempor do aliquid no",
        "project_type": 1,
        "project_manager_uuid": "b4d84c46-1513-42ac-9d9f-dd56fa3d853c",
        "archived": false,
        "is_confidential": false,
        "is_confirmed": true,
        "latitude": 40.7094756,
        "longitude": -74.0072955,
        "storage_needs_calc": true,
        "storage_usage_mb": 0,
        "has_soil_upload": false,
        "has_water_upload": false,
        "has_leachate_upload": false,
        "has_soilgas_upload": false,
        "has_xrf_data": false,
        "has_chemical_misalignment": false,
        "has_sample_merging_misalignment": false,
        "has_matrice_misalignment": false,
        "has_unit_misalignment": false,
        "has_rpd_misalignment": false,
        "has_spatial_misalignment": false,
        "is_gather_non_spatial_view": false,
        "is_legacy_gather_table": true,
        "project_address": "123 William Street, New York, NY, USA",
        "google_place_id": "ChIJIaGbBBhawokRUmbgNsUmr-s",
        "address_street": "123 William Street",
        "address_locality": "Manhattan",
        "address_city": "New York",
        "address_state": "New York",
        "address_country": "United States",
        "address_postcode": "10038",
        "measurement_type": "inch",
        "timezone": "America\/Los_Angeles",
        "enviro_processed_at": null,
        "updated_at": "2024-01-26T02:49:45.000000Z",
        "created_at": "2024-01-24T03:48:57.000000Z"
    },
    "project_link": "http:\/\/datanest.localhost:8080\/open-project\/005056a4-ecd7-4ded-87bc-dad952efe1a5",
    "item": null,
    "file": {
        "id": "9b2e7091-22bc-4a25-b9d7-d6701a50387a",
        "display_name": "Data Event Webhooks - Document (1) - Claim-6 - #013.docx",
        "path": "Auto Docs\/Document (1)",
        "size_mb": 0.028589248657227,
        "link": "http:\/\/datanest.localhost:8080\/open-project\/005056a4-ecd7-4ded-87bc-dad952efe1a5?redirect=%2Ffile%2F9b2e7091-22bc-4a25-b9d7-d6701a50387a",
        "temporary_s3_link": "https:\/\/datanest-staging.s3.ap-southeast-2.amazonaws.com\/files\/...(ommitted)"
    },
    "document": {
        "id": 5113,
        "type": 0,
        "status": 0,
        "has_been_exported": 1,
        "name": "Document (1)",
        "link": "http:\/\/datanest.localhost:8080\/open-project\/005056a4-ecd7-4ded-87bc-dad952efe1a5?redirect=%2Fdeliver%2Fword%2Feditor%2F5113"
    }
}
```
</details>

## Tips to prevent infinite loops

You can use Data Event Conditions to check, for example, a dropdown is set to "Ready for Review". The first action could be a "Set Gather Value" to set the dropdown to "Sent for Review", before the second action could be a "Send Email" action. This would prevent the email from being sent twice, especially if someone is making rapid changes during data collection. For the user to resend the email they can manually set it back to "Ready for Review" for the Data Event to trigger again.