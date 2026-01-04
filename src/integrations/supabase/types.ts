export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      asset_networks: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          network_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          network_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          network_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_networks_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_networks_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_type: string | null
          created_at: string | null
          criticality: Database["public"]["Enums"]["asset_criticality"] | null
          environment: Database["public"]["Enums"]["asset_environment"] | null
          hostname: string
          id: string
          ip_address: unknown
          last_seen: string | null
          location: string | null
          mac_address: string | null
          notes: string | null
          os: string | null
          os_version: string | null
          owner: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          asset_type?: string | null
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"] | null
          environment?: Database["public"]["Enums"]["asset_environment"] | null
          hostname: string
          id?: string
          ip_address?: unknown
          last_seen?: string | null
          location?: string | null
          mac_address?: string | null
          notes?: string | null
          os?: string | null
          os_version?: string | null
          owner?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          asset_type?: string | null
          created_at?: string | null
          criticality?: Database["public"]["Enums"]["asset_criticality"] | null
          environment?: Database["public"]["Enums"]["asset_environment"] | null
          hostname?: string
          id?: string
          ip_address?: unknown
          last_seen?: string | null
          location?: string | null
          mac_address?: string | null
          notes?: string | null
          os?: string | null
          os_version?: string | null
          owner?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      changes: {
        Row: {
          approved_at: string | null
          approver: string | null
          change_number: string | null
          change_type: Database["public"]["Enums"]["change_type"]
          closed_at: string | null
          created_at: string | null
          description: string | null
          evidence_links: string[] | null
          id: string
          impacted_asset_ids: string[] | null
          impacted_network_ids: string[] | null
          implemented_at: string | null
          planned_end: string | null
          planned_start: string | null
          risk_level: Database["public"]["Enums"]["change_risk_level"] | null
          rollback_plan: string | null
          status: Database["public"]["Enums"]["change_status"] | null
          timeline: Json | null
          title: string
          updated_at: string | null
          user_id: string
          validation_steps: Json | null
          verified_at: string | null
          workspace_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approver?: string | null
          change_number?: string | null
          change_type: Database["public"]["Enums"]["change_type"]
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          evidence_links?: string[] | null
          id?: string
          impacted_asset_ids?: string[] | null
          impacted_network_ids?: string[] | null
          implemented_at?: string | null
          planned_end?: string | null
          planned_start?: string | null
          risk_level?: Database["public"]["Enums"]["change_risk_level"] | null
          rollback_plan?: string | null
          status?: Database["public"]["Enums"]["change_status"] | null
          timeline?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          validation_steps?: Json | null
          verified_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approver?: string | null
          change_number?: string | null
          change_type?: Database["public"]["Enums"]["change_type"]
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          evidence_links?: string[] | null
          id?: string
          impacted_asset_ids?: string[] | null
          impacted_network_ids?: string[] | null
          implemented_at?: string | null
          planned_end?: string | null
          planned_start?: string | null
          risk_level?: Database["public"]["Enums"]["change_risk_level"] | null
          rollback_plan?: string | null
          status?: Database["public"]["Enums"]["change_status"] | null
          timeline?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          validation_steps?: Json | null
          verified_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "changes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      detections: {
        Row: {
          created_at: string | null
          data_sources: string[] | null
          enabled: boolean | null
          false_positive_rate: number | null
          id: string
          last_fired_at: string | null
          mitre_techniques: string[] | null
          name: string
          notes: string | null
          owner: string | null
          platform: string
          query_text: string | null
          schedule: string | null
          severity: Database["public"]["Enums"]["vuln_severity"] | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_sources?: string[] | null
          enabled?: boolean | null
          false_positive_rate?: number | null
          id?: string
          last_fired_at?: string | null
          mitre_techniques?: string[] | null
          name: string
          notes?: string | null
          owner?: string | null
          platform?: string
          query_text?: string | null
          schedule?: string | null
          severity?: Database["public"]["Enums"]["vuln_severity"] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_sources?: string[] | null
          enabled?: boolean | null
          false_positive_rate?: number | null
          id?: string
          last_fired_at?: string | null
          mitre_techniques?: string[] | null
          name?: string
          notes?: string | null
          owner?: string | null
          platform?: string
          query_text?: string | null
          schedule?: string | null
          severity?: Database["public"]["Enums"]["vuln_severity"] | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          incident_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          incident_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          incident_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_assets_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          artifacts: string[] | null
          closed_at: string | null
          created_at: string | null
          description: string | null
          id: string
          incident_number: string | null
          lessons_learned: string | null
          opened_at: string | null
          post_incident_checklist: Json | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["incident_severity"] | null
          status: Database["public"]["Enums"]["incident_status"] | null
          tags: string[] | null
          timeline: Json | null
          title: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          artifacts?: string[] | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          incident_number?: string | null
          lessons_learned?: string | null
          opened_at?: string | null
          post_incident_checklist?: Json | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"] | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          tags?: string[] | null
          timeline?: Json | null
          title: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          artifacts?: string[] | null
          closed_at?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          incident_number?: string | null
          lessons_learned?: string | null
          opened_at?: string | null
          post_incident_checklist?: Json | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"] | null
          status?: Database["public"]["Enums"]["incident_status"] | null
          tags?: string[] | null
          timeline?: Json | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incidents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          created_at: string
          encrypted_value: string
          id: string
          integration_id: string
          key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_value: string
          id?: string
          integration_id: string
          key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_value?: string
          id?: string
          integration_id?: string
          key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_secrets_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          status: string
          type: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interfaces: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          mac_address: string | null
          name: string
          status: string | null
          updated_at: string | null
          vlan_id: string | null
          workspace_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mac_address?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          vlan_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          mac_address?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          vlan_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interfaces_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interfaces_vlan_id_fkey"
            columns: ["vlan_id"]
            isOneToOne: false
            referencedRelation: "vlans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interfaces_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      log_snippets: {
        Row: {
          content: string | null
          created_at: string | null
          description: string | null
          id: string
          log_source: string | null
          query: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          log_source?: string | null
          query?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          log_source?: string | null
          query?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "log_snippets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      networks: {
        Row: {
          cidr: string
          created_at: string | null
          description: string | null
          dns_servers: string[] | null
          firewall_zone: string | null
          gateway: string | null
          id: string
          name: string
          routing_notes: string | null
          site_id: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string
          vlan_id: number | null
          workspace_id: string | null
        }
        Insert: {
          cidr: string
          created_at?: string | null
          description?: string | null
          dns_servers?: string[] | null
          firewall_zone?: string | null
          gateway?: string | null
          id?: string
          name: string
          routing_notes?: string | null
          site_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id: string
          vlan_id?: number | null
          workspace_id?: string | null
        }
        Update: {
          cidr?: string
          created_at?: string | null
          description?: string | null
          dns_servers?: string[] | null
          firewall_zone?: string | null
          gateway?: string | null
          id?: string
          name?: string
          routing_notes?: string | null
          site_id?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string
          vlan_id?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "networks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "networks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          link: string | null
          message: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ports_services: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          last_seen: string | null
          port: number
          protocol: string | null
          service_name: string | null
          status: string | null
          updated_at: string | null
          version: string | null
          workspace_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          last_seen?: string | null
          port: number
          protocol?: string | null
          service_name?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          workspace_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          last_seen?: string | null
          port?: number
          protocol?: string | null
          service_name?: string | null
          status?: string | null
          updated_at?: string | null
          version?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ports_services_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ports_services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      runbooks: {
        Row: {
          category: string | null
          commands: Json | null
          created_at: string | null
          description: string | null
          id: string
          last_used: string | null
          steps: Json | null
          tags: string[] | null
          title: string
          updated_at: string | null
          use_count: number | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category?: string | null
          commands?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used?: string | null
          steps?: Json | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          use_count?: number | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category?: string | null
          commands?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          last_used?: string | null
          steps?: Json | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runbooks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          created_at: string
          ended_at: string | null
          errors: Json | null
          id: string
          integration_id: string
          records_in: number | null
          records_out: number | null
          started_at: string
          status: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          errors?: Json | null
          id?: string
          integration_id: string
          records_in?: number | null
          records_out?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          errors?: Json | null
          id?: string
          integration_id?: string
          records_in?: number | null
          records_out?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_incident_id: string | null
          related_vulnerability_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_incident_id?: string | null
          related_vulnerability_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_incident_id?: string | null
          related_vulnerability_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_related_incident_id_fkey"
            columns: ["related_incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_vulnerability_id_fkey"
            columns: ["related_vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vlans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          network_id: string | null
          site_id: string | null
          updated_at: string | null
          user_id: string
          vlan_id: number
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          network_id?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id: string
          vlan_id: number
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          network_id?: string | null
          site_id?: string | null
          updated_at?: string | null
          user_id?: string
          vlan_id?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vlans_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: false
            referencedRelation: "networks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vlans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vuln_assets: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          vulnerability_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          vulnerability_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          vulnerability_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vuln_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vuln_assets_vulnerability_id_fkey"
            columns: ["vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerabilities: {
        Row: {
          created_at: string | null
          cve_id: string | null
          cvss_score: number | null
          description: string | null
          evidence_links: string[] | null
          first_detected: string | null
          id: string
          remediation_steps: string | null
          severity: Database["public"]["Enums"]["vuln_severity"] | null
          sla_due_date: string | null
          solution: string | null
          source: string | null
          status: Database["public"]["Enums"]["vuln_status"] | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          cve_id?: string | null
          cvss_score?: number | null
          description?: string | null
          evidence_links?: string[] | null
          first_detected?: string | null
          id?: string
          remediation_steps?: string | null
          severity?: Database["public"]["Enums"]["vuln_severity"] | null
          sla_due_date?: string | null
          solution?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["vuln_status"] | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          cve_id?: string | null
          cvss_score?: number | null
          description?: string | null
          evidence_links?: string[] | null
          first_detected?: string | null
          id?: string
          remediation_steps?: string | null
          severity?: Database["public"]["Enums"]["vuln_severity"] | null
          sla_due_date?: string | null
          solution?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["vuln_status"] | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_workspaces: {
        Args: { _user_id: string }
        Returns: {
          user_role: Database["public"]["Enums"]["workspace_role"]
          workspace_id: string
          workspace_name: string
          workspace_slug: string
        }[]
      }
      has_workspace_role: {
        Args: {
          _role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      has_workspace_role_or_higher: {
        Args: {
          _min_role: Database["public"]["Enums"]["workspace_role"]
          _user_id: string
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      asset_criticality: "critical" | "high" | "medium" | "low"
      asset_environment:
        | "production"
        | "staging"
        | "development"
        | "testing"
        | "dmz"
      change_risk_level: "Low" | "Medium" | "High" | "Critical"
      change_status:
        | "Draft"
        | "Review"
        | "Approved"
        | "Implemented"
        | "Verified"
        | "Closed"
      change_type: "Firewall" | "ACL" | "Routing" | "VPN" | "Switch" | "DNS"
      incident_severity: "critical" | "high" | "medium" | "low"
      incident_status:
        | "open"
        | "investigating"
        | "contained"
        | "eradicated"
        | "recovered"
        | "closed"
      task_status: "pending" | "in_progress" | "completed" | "blocked"
      vuln_severity: "critical" | "high" | "medium" | "low" | "informational"
      vuln_status:
        | "new"
        | "triage"
        | "in_progress"
        | "mitigated"
        | "accepted"
        | "false_positive"
      workspace_role: "owner" | "admin" | "analyst" | "readonly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      asset_criticality: ["critical", "high", "medium", "low"],
      asset_environment: [
        "production",
        "staging",
        "development",
        "testing",
        "dmz",
      ],
      change_risk_level: ["Low", "Medium", "High", "Critical"],
      change_status: [
        "Draft",
        "Review",
        "Approved",
        "Implemented",
        "Verified",
        "Closed",
      ],
      change_type: ["Firewall", "ACL", "Routing", "VPN", "Switch", "DNS"],
      incident_severity: ["critical", "high", "medium", "low"],
      incident_status: [
        "open",
        "investigating",
        "contained",
        "eradicated",
        "recovered",
        "closed",
      ],
      task_status: ["pending", "in_progress", "completed", "blocked"],
      vuln_severity: ["critical", "high", "medium", "low", "informational"],
      vuln_status: [
        "new",
        "triage",
        "in_progress",
        "mitigated",
        "accepted",
        "false_positive",
      ],
      workspace_role: ["owner", "admin", "analyst", "readonly"],
    },
  },
} as const
