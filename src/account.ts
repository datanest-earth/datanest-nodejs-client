import DatanestClient from "./index";

export type SubscriptionTier = 'Start-up' | 'Light' | 'Growth' | 'Enterprise';

/**
 * Many of these settings can be adjusted by your Datanest Account Manager
 * via Company Settings or by contacting support.
 */
export type CompanyDetails = {
    ref: string;
    company_name: string;
    team_role_defaults: TeamRoleDefaults | null;
    project_additional_settings: ProjectAdditionalSetting[] | null;
    /** Updates daily, new accounts may be null */
    storage_usage_mb: number | null;
    /** Null is unlimited */
    subscription_user_limit: null | number;
    /** Null is unlimited */
    subscription_project_limit: null | number;
    /** Null is unlimited */
    subscription_annual_project_limit: null | number;
    /** In MB, null is unlimited */
    subscription_storage_limit: null | number;
    /** In MB, for current annual billing period, Null is unlimited */
    subscription_storage_annual_limit: null | number;
    /** Enforce storage limit */
    subscription_storage_enforce_limit: boolean;
    /** Enforce project limit */
    subscription_project_enforce_limit: boolean;
    /** In rare cases these could be null */
    subscription_start: string | null;
    /** In rare cases these could be null */
    subscription_until: string | null;
    subscription_is_trial: boolean;
    subscription_auto_lockout: boolean;
    subscription_tier: SubscriptionTier;
    /** Cost per project created, null is no charge */
    project_one_off_charge: null | number;
    is_chemical_group_restricted: boolean;
    is_scenario_set_restricted: boolean;
    is_custom_criteria_restricted: boolean;
    is_display_enviro_basis_on: boolean;
    use_uploaded_chemical_title: boolean;
    keep_conservative_eql_on_upload: boolean;
};

/** Null is full access otherwise it is an ID of the Company Custom Role */
export type TeamRoleDefaults = {
    /** Default fallback Company Custom Role ID. Null is full access */
    default?: null | number;
    /** When an Account Manager joins a project this specifies Company Custom Role ID. Null uses to `default` */
    "account-manager"?: null | number;
};

export type ProjectAdditionalSetting = {
    label: string;
    slug: string;
    required: boolean;
    type: 'text' | 'date' | 'number';
};

export async function getCompanyAccountDetails(client: DatanestClient) {
    const response = await client.get('v1/company');
    const data = await response.json();
    return data as {
        company: CompanyDetails;
    };
}