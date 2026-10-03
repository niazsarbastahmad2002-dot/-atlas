export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointment_audit_events: {
        Row: { action: string; actor_id: string | null; actor_type: string; after_state: Json | null; appointment_id: string | null; before_state: Json | null; clinic_id: string; entity_id: string | null; entity_type: string; from_status: string | null; id: number; occurred_at: string; reason: string | null; to_status: string | null }
        Insert: { action: string; actor_id?: string | null; actor_type: string; after_state?: Json | null; appointment_id?: string | null; before_state?: Json | null; clinic_id: string; entity_id?: string | null; entity_type?: string; from_status?: string | null; id?: never; occurred_at?: string; reason?: string | null; to_status?: string | null }
        Update: { action?: string; actor_id?: string | null; actor_type?: string; after_state?: Json | null; appointment_id?: string | null; before_state?: Json | null; clinic_id?: string; entity_id?: string | null; entity_type?: string; from_status?: string | null; id?: never; occurred_at?: string; reason?: string | null; to_status?: string | null }
        Relationships: [
          { foreignKeyName: "appointment_audit_events_appointment_id_fkey"; columns: ["appointment_id"]; isOneToOne: false; referencedRelation: "appointments"; referencedColumns: ["id"] },
          { foreignKeyName: "appointment_audit_events_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] },
        ]
      }
      appointment_reminders: {
        Row: { appointment_id: string; appointment_revision: number; attempts: number; clinic_id: string; created_at: string; id: string; last_error_code: string | null; locked_at: string | null; locked_by: string | null; max_attempts: number; next_attempt_at: string; provider_message_id: string | null; scheduled_for: string; sent_at: string | null; status: string; template_language: string; template_name: string; updated_at: string }
        Insert: { appointment_id: string; appointment_revision?: number; attempts?: number; clinic_id: string; created_at?: string; id?: string; last_error_code?: string | null; locked_at?: string | null; locked_by?: string | null; max_attempts?: number; next_attempt_at: string; provider_message_id?: string | null; scheduled_for: string; sent_at?: string | null; status?: string; template_language: string; template_name: string; updated_at?: string }
        Update: { appointment_id?: string; appointment_revision?: number; attempts?: number; clinic_id?: string; created_at?: string; id?: string; last_error_code?: string | null; locked_at?: string | null; locked_by?: string | null; max_attempts?: number; next_attempt_at?: string; provider_message_id?: string | null; scheduled_for?: string; sent_at?: string | null; status?: string; template_language?: string; template_name?: string; updated_at?: string }
        Relationships: [
          { foreignKeyName: "appointment_reminders_appointment_id_fkey"; columns: ["appointment_id"]; isOneToOne: false; referencedRelation: "appointments"; referencedColumns: ["id"] },
          { foreignKeyName: "appointment_reminders_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] },
        ]
      }
      appointments: {
        Row: { appointment_at: string; appointment_revision: number; clinic_id: string; contact_relationship: string; created_at: string; doctor_id: string | null; doctor_name: string; id: string; idempotency_key: string; patient_name: string; patient_phone: string; reminder_consent: boolean; reminder_consent_at: string | null; reminder_language: string; reminder_status: string; status: string; updated_at: string; void_reason: string | null; voided_at: string | null; voided_by: string | null }
        Insert: { appointment_at: string; appointment_revision?: number; clinic_id: string; contact_relationship?: string; created_at?: string; doctor_id?: string | null; doctor_name: string; id?: string; idempotency_key?: string; patient_name: string; patient_phone: string; reminder_consent?: boolean; reminder_consent_at?: string | null; reminder_language?: string; reminder_status?: string; status?: string; updated_at?: string; void_reason?: string | null; voided_at?: string | null; voided_by?: string | null }
        Update: { appointment_at?: string; appointment_revision?: number; clinic_id?: string; contact_relationship?: string; created_at?: string; doctor_id?: string | null; doctor_name?: string; id?: string; idempotency_key?: string; patient_name?: string; patient_phone?: string; reminder_consent?: boolean; reminder_consent_at?: string | null; reminder_language?: string; reminder_status?: string; status?: string; updated_at?: string; void_reason?: string | null; voided_at?: string | null; voided_by?: string | null }
        Relationships: [
          { foreignKeyName: "appointments_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] },
          { foreignKeyName: "appointments_doctor_tenant_fkey"; columns: ["clinic_id", "doctor_id"]; isOneToOne: false; referencedRelation: "doctors"; referencedColumns: ["clinic_id", "id"] },
        ]
      }
      clinic_members: {
        Row: { assigned_doctor_id: string | null; clinic_id: string; role: string; user_id: string }
        Insert: { assigned_doctor_id?: string | null; clinic_id: string; role?: string; user_id: string }
        Update: { assigned_doctor_id?: string | null; clinic_id?: string; role?: string; user_id?: string }
        Relationships: [
          { foreignKeyName: "clinic_members_assigned_doctor_id_fkey"; columns: ["assigned_doctor_id"]; isOneToOne: false; referencedRelation: "doctors"; referencedColumns: ["id"] },
          { foreignKeyName: "clinic_members_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] },
        ]
      }
      clinic_reminder_settings: {
        Row: { clinic_id: string; daily_message_limit: number; default_reminder_language: string; enabled: boolean; lead_minutes: number; messaging_approved_at: string | null; second_lead_minutes: number | null; template_language: string; template_name: string; updated_at: string }
        Insert: { clinic_id: string; daily_message_limit?: number; default_reminder_language?: string; enabled?: boolean; lead_minutes?: number; messaging_approved_at?: string | null; second_lead_minutes?: number | null; template_language?: string; template_name?: string; updated_at?: string }
        Update: { clinic_id?: string; daily_message_limit?: number; default_reminder_language?: string; enabled?: boolean; lead_minutes?: number; messaging_approved_at?: string | null; second_lead_minutes?: number | null; template_language?: string; template_name?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "clinic_reminder_settings_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: true; referencedRelation: "clinics"; referencedColumns: ["id"] }]
      }
      clinic_directory_profiles: {
        Row: { address_text: string | null; area: string | null; city: string | null; clinic_id: string; country_code: string; created_at: string; description: string | null; display_name: string; is_published: boolean; latitude: number | null; longitude: number | null; public_phone: string | null; published_at: string | null; slug: string; updated_at: string }
        Insert: { address_text?: string | null; area?: string | null; city?: string | null; clinic_id: string; country_code?: string; created_at?: string; description?: string | null; display_name: string; is_published?: boolean; latitude?: number | null; longitude?: number | null; public_phone?: string | null; published_at?: string | null; slug: string; updated_at?: string }
        Update: { address_text?: string | null; area?: string | null; city?: string | null; clinic_id?: string; country_code?: string; created_at?: string; description?: string | null; display_name?: string; is_published?: boolean; latitude?: number | null; longitude?: number | null; public_phone?: string | null; published_at?: string | null; slug?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "clinic_directory_profiles_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: true; referencedRelation: "clinics"; referencedColumns: ["id"] }]
      }
      clinic_public_booking_settings: {
        Row: { booking_horizon_days: number; clinic_id: string; created_at: string; enabled: boolean; min_lead_minutes: number; updated_at: string }
        Insert: { booking_horizon_days?: number; clinic_id: string; created_at?: string; enabled?: boolean; min_lead_minutes?: number; updated_at?: string }
        Update: { booking_horizon_days?: number; clinic_id?: string; created_at?: string; enabled?: boolean; min_lead_minutes?: number; updated_at?: string }
        Relationships: [{ foreignKeyName: "clinic_public_booking_settings_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: true; referencedRelation: "clinics"; referencedColumns: ["id"] }]
      }
      clinics: {
        Row: { appointment_interval_minutes: number; created_at: string; id: string; name: string; owner_id: string }
        Insert: { appointment_interval_minutes?: number; created_at?: string; id?: string; name: string; owner_id: string }
        Update: { appointment_interval_minutes?: number; created_at?: string; id?: string; name?: string; owner_id?: string }
        Relationships: []
      }
      doctor_public_booking_closed_dates: {
        Row: { booking_date: string; clinic_id: string; created_at: string; doctor_id: string; is_closed: boolean; updated_at: string }
        Insert: { booking_date: string; clinic_id: string; created_at?: string; doctor_id: string; is_closed?: boolean; updated_at?: string }
        Update: { booking_date?: string; clinic_id?: string; created_at?: string; doctor_id?: string; is_closed?: boolean; updated_at?: string }
        Relationships: [{ foreignKeyName: "doctor_public_booking_closed_doctor_fkey"; columns: ["clinic_id", "doctor_id"]; isOneToOne: false; referencedRelation: "doctors"; referencedColumns: ["clinic_id", "id"] }]
      }
      doctor_public_booking_hours: {
        Row: { clinic_id: string; created_at: string; doctor_id: string; ends_at: string; is_enabled: boolean; starts_at: string; updated_at: string; weekday: number }
        Insert: { clinic_id: string; created_at?: string; doctor_id: string; ends_at: string; is_enabled?: boolean; starts_at: string; updated_at?: string; weekday: number }
        Update: { clinic_id?: string; created_at?: string; doctor_id?: string; ends_at?: string; is_enabled?: boolean; starts_at?: string; updated_at?: string; weekday?: number }
        Relationships: [{ foreignKeyName: "doctor_public_booking_hours_doctor_fkey"; columns: ["clinic_id", "doctor_id"]; isOneToOne: false; referencedRelation: "doctors"; referencedColumns: ["clinic_id", "id"] }]
      }
      doctor_directory_profiles: {
        Row: { bio: string | null; clinic_id: string; created_at: string; display_name: string; doctor_id: string; is_published: boolean; published_at: string | null; slug: string; specialty: string; subspecialty: string | null; updated_at: string }
        Insert: { bio?: string | null; clinic_id: string; created_at?: string; display_name: string; doctor_id: string; is_published?: boolean; published_at?: string | null; slug: string; specialty: string; subspecialty?: string | null; updated_at?: string }
        Update: { bio?: string | null; clinic_id?: string; created_at?: string; display_name?: string; doctor_id?: string; is_published?: boolean; published_at?: string | null; slug?: string; specialty?: string; subspecialty?: string | null; updated_at?: string }
        Relationships: [
          { foreignKeyName: "doctor_directory_doctor_fkey"; columns: ["clinic_id", "doctor_id"]; isOneToOne: true; referencedRelation: "doctors"; referencedColumns: ["clinic_id", "id"] },
        ]
      }
      doctors: {
        Row: { active: boolean; clinic_id: string; created_at: string; created_by: string | null; display_order: number; id: string; name: string; updated_at: string }
        Insert: { active?: boolean; clinic_id: string; created_at?: string; created_by?: string | null; display_order?: number; id?: string; name: string; updated_at?: string }
        Update: { active?: boolean; clinic_id?: string; created_at?: string; created_by?: string | null; display_order?: number; id?: string; name?: string; updated_at?: string }
        Relationships: [{ foreignKeyName: "doctors_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] }]
      }
      pending_reminder_delivery_events: {
        Row: { error_code: string | null; event_key: string; occurred_at: string; provider_message_id: string; received_at: string; status: string }
        Insert: { error_code?: string | null; event_key: string; occurred_at: string; provider_message_id: string; received_at?: string; status: string }
        Update: { error_code?: string | null; event_key?: string; occurred_at?: string; provider_message_id?: string; received_at?: string; status?: string }
        Relationships: []
      }
      reminder_delivery_events: {
        Row: { clinic_id: string; error_code: string | null; event_key: string; id: number; occurred_at: string; received_at: string; reminder_id: string; status: string }
        Insert: { clinic_id: string; error_code?: string | null; event_key: string; id?: never; occurred_at: string; received_at?: string; reminder_id: string; status: string }
        Update: { clinic_id?: string; error_code?: string | null; event_key?: string; id?: never; occurred_at?: string; received_at?: string; reminder_id?: string; status?: string }
        Relationships: [
          { foreignKeyName: "reminder_delivery_events_clinic_id_fkey"; columns: ["clinic_id"]; isOneToOne: false; referencedRelation: "clinics"; referencedColumns: ["id"] },
          { foreignKeyName: "reminder_delivery_events_reminder_id_fkey"; columns: ["reminder_id"]; isOneToOne: false; referencedRelation: "appointment_reminders"; referencedColumns: ["id"] },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      claim_due_whatsapp_reminders: { Args: { p_global_daily_limit?: number; p_limit?: number; p_worker_id: string }; Returns: { appointment_at: string; clinic_name: string; patient_phone: string; reminder_id: string; template_language: string; template_name: string }[] }
      complete_whatsapp_reminder: { Args: { p_provider_message_id: string; p_reminder_id: string; p_worker_id: string }; Returns: boolean }
      consume_patient_link_rate_limit: { Args: { p_bucket_hash: string }; Returns: boolean }
      consume_reminder_scheduler_token: { Args: { p_token_hash: string }; Returns: boolean }
      create_patient_access_token_server: { Args: { p_actor_id: string; p_appointment_id: string; p_expires_at: string; p_token_hash: string }; Returns: boolean }
      fail_whatsapp_reminder: { Args: { p_error_code: string; p_reminder_id: string; p_retryable: boolean; p_worker_id: string }; Returns: boolean }
      finalize_verified_public_booking_service: { Args: { p_clinic_slug: string; p_doctor_slug: string; p_idempotency_key: string; p_patient_name: string; p_patient_token_expires_at: string; p_patient_token_hash: string; p_reminder_consent?: boolean; p_reminder_language?: string; p_slot_at: string; p_verified_user_id: string }; Returns: { appointment_id: string | null; result: string }[] }
      get_public_clinic_profile: { Args: { p_slug: string }; Returns: { address_text: string | null; area: string | null; city: string | null; country_code: string; description: string | null; display_name: string; latitude: number | null; longitude: number | null; public_phone: string | null; slug: string }[] }
      get_public_doctor_profile: { Args: { p_clinic_slug: string; p_doctor_slug: string }; Returns: { address_text: string | null; area: string | null; bio: string | null; city: string | null; clinic_name: string; clinic_slug: string; country_code: string; doctor_name: string; doctor_slug: string; latitude: number | null; longitude: number | null; public_phone: string | null; specialty: string; subspecialty: string | null }[] }
      list_public_doctors: { Args: { p_clinic_slug: string }; Returns: { bio: string | null; display_name: string; slug: string; specialty: string; subspecialty: string | null }[] }
      list_public_doctor_slots: { Args: { p_clinic_slug: string; p_days?: number; p_doctor_slug: string; p_from_date?: string | null }; Returns: { appointment_interval_minutes: number; slot_at: string }[] }
      save_doctor_public_booking_hours: { Args: { p_clinic_id: string; p_doctor_id: string; p_hours: Json }; Returns: boolean }
      create_public_booking_service: { Args: { p_clinic_slug: string; p_doctor_slug: string; p_idempotency_key: string; p_patient_name: string; p_patient_phone: string; p_reminder_consent?: boolean; p_reminder_language?: string; p_slot_at: string }; Returns: { appointment_id: string | null; result: string }[] }
      search_public_doctors_with_availability: { Args: { p_city?: string | null; p_limit?: number; p_query?: string | null; p_specialty?: string | null }; Returns: { area: string | null; city: string | null; clinic_name: string; clinic_slug: string; country_code: string; doctor_name: string; doctor_slug: string; next_available_at: string | null; specialty: string; subspecialty: string | null }[] }
      search_public_doctors: { Args: { p_city?: string | null; p_limit?: number; p_query?: string | null; p_specialty?: string | null }; Returns: { area: string | null; city: string | null; clinic_name: string; clinic_slug: string; country_code: string; doctor_name: string; doctor_slug: string; specialty: string; subspecialty: string | null }[] }
      get_patient_appointment: { Args: { p_token_hash: string }; Returns: { appointment_at: string; appointment_interval_minutes: number; appointment_status: string; appointments_ahead: number; clinic_name: string; doctor_name: string; doctor_specialty: string; queue_position: number; receptionist_phone: string; reminder_language: string; token_expires_at: string }[] }
      patient_list_reschedule_slots: { Args: { p_days?: number; p_token_hash: string }; Returns: { appointment_interval_minutes: number; slot_at: string }[] }
      patient_reschedule_appointment: { Args: { p_slot_at: string; p_token_hash: string }; Returns: string }
      patient_get_clinic_location: { Args: { p_token_hash: string }; Returns: { address_text: string | null; area: string | null; city: string | null; clinic_slug: string; latitude: number | null; longitude: number | null }[] }
      patient_get_day_flow: { Args: { p_token_hash: string }; Returns: { delay_minutes: number; timing_updated_at: string }[] }
      patient_update_appointment: { Args: { p_status: string; p_token_hash: string }; Returns: string }
      record_whatsapp_delivery_status: { Args: { p_error_code?: string; p_event_key: string; p_occurred_at: string; p_provider_message_id: string; p_status: string }; Returns: boolean }
      transfer_clinic_administrator: { Args: { p_actor_id: string; p_clinic_id: string; p_new_administrator_id: string }; Returns: boolean }
      validate_whatsapp_reminder_claim: { Args: { p_reminder_id: string; p_worker_id: string }; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends { Row: infer R } ? R : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends { Row: infer R } ? R : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Insert: infer I } ? I : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I } ? I : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends { Update: infer U } ? U : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U } ? U : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never

export const Constants = { public: { Enums: {} } } as const
