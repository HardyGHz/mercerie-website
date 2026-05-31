import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://icapxypmirhesekduzkq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljYXB4eXBtaXJoZXNla2R1emtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTIyMjUsImV4cCI6MjA4OTQ4ODIyNX0.-SyihpIlyJo9qZdV-gPBtQa7n7idZWcCxlukOEw50ag';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const LEADS_TABLE = 'crm_leads';
export const SCRIPTS_TABLE = 'crm_scripts';
