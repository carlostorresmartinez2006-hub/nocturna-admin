export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amigos: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "amigos_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amigos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bares: {
        Row: {
          contacto: string | null
          created_at: string | null
          descripcion: string | null
          direccion: string | null
          es_destacado: boolean | null
          horario: string | null
          id: string
          image_url: string | null
          latitud: number | null
          longitud: number | null
          nombre: string
          precio_rango: string | null
          rating: number | null
          reviews_count: number | null
          tags: string[] | null
          tipo: string
        }
        Insert: {
          contacto?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          es_destacado?: boolean | null
          horario?: string | null
          id?: string
          image_url?: string | null
          latitud?: number | null
          longitud?: number | null
          nombre: string
          precio_rango?: string | null
          rating?: number | null
          reviews_count?: number | null
          tags?: string[] | null
          tipo: string
        }
        Update: {
          contacto?: string | null
          created_at?: string | null
          descripcion?: string | null
          direccion?: string | null
          es_destacado?: boolean | null
          horario?: string | null
          id?: string
          image_url?: string | null
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          precio_rango?: string | null
          rating?: number | null
          reviews_count?: number | null
          tags?: string[] | null
          tipo?: string
        }
        Relationships: []
      }
      bloqueados: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string | null
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bloqueados_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bloqueados_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      destacados: {
        Row: {
          action_url: string
          badge_text: string
          created_at: string | null
          id: string
          image_url: string
          subtitle: string
          title: string
        }
        Insert: {
          action_url: string
          badge_text: string
          created_at?: string | null
          id?: string
          image_url: string
          subtitle: string
          title: string
        }
        Update: {
          action_url?: string
          badge_text?: string
          created_at?: string | null
          id?: string
          image_url?: string
          subtitle?: string
          title?: string
        }
        Relationships: []
      }
      entradas: {
        Row: {
          created_at: string
          email_ticket: string | null
          estado: string
          evento_id: string | null
          id: string
          imagen_url: string | null
          nombre_ticket: string | null
          qr_code: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email_ticket?: string | null
          estado?: string
          evento_id?: string | null
          id?: string
          imagen_url?: string | null
          nombre_ticket?: string | null
          qr_code?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email_ticket?: string | null
          estado?: string
          evento_id?: string | null
          id?: string
          imagen_url?: string | null
          nombre_ticket?: string | null
          qr_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          created_at: string | null
          cupo_ventas: number | null
          descripcion: string | null
          enlace_rrpp: string
          fecha_evento: string | null
          fecha_texto: string | null
          fourvenues_evento_id: string | null
          id: string
          imagen_cartel_url: string | null
          local_id: string
          local_texto: string | null
          precio: string | null
          titulo: string
        }
        Insert: {
          created_at?: string | null
          cupo_ventas?: number | null
          descripcion?: string | null
          enlace_rrpp: string
          fecha_evento?: string | null
          fecha_texto?: string | null
          fourvenues_evento_id?: string | null
          id?: string
          imagen_cartel_url?: string | null
          local_id: string
          local_texto?: string | null
          precio?: string | null
          titulo: string
        }
        Update: {
          created_at?: string | null
          cupo_ventas?: number | null
          descripcion?: string | null
          enlace_rrpp?: string
          fecha_evento?: string | null
          fecha_texto?: string | null
          fourvenues_evento_id?: string | null
          id?: string
          imagen_cartel_url?: string | null
          local_id?: string
          local_texto?: string | null
          precio?: string | null
          titulo?: string
        }
        Relationships: []
      }
      locales: {
        Row: {
          created_at: string
          descripcion: string | null
          direccion: string
          edad_minima: string | null
          estilo: string | null
          horario_habitual: string | null
          id: string
          imagen_url: string | null
          latitud: number | null
          longitud: number | null
          nombre: string
          precio_copa: string | null
          precio_tercio: string | null
          tipo: string
          vestimenta: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          direccion: string
          edad_minima?: string | null
          estilo?: string | null
          horario_habitual?: string | null
          id?: string
          imagen_url?: string | null
          latitud?: number | null
          longitud?: number | null
          nombre: string
          precio_copa?: string | null
          precio_tercio?: string | null
          tipo: string
          vestimenta?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          direccion?: string
          edad_minima?: string | null
          estilo?: string | null
          horario_habitual?: string | null
          id?: string
          imagen_url?: string | null
          latitud?: number | null
          longitud?: number | null
          nombre?: string
          precio_copa?: string | null
          precio_tercio?: string | null
          tipo?: string
          vestimenta?: string | null
        }
        Relationships: []
      }
      notificaciones: {
        Row: {
          created_at: string
          emisor_id: string | null
          id: string
          leida: boolean
          mensaje: string
          reference_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emisor_id?: string | null
          id?: string
          leida?: boolean
          mensaje: string
          reference_id?: string | null
          tipo: string
          user_id: string
        }
        Update: {
          created_at?: string
          emisor_id?: string | null
          id?: string
          leida?: boolean
          mensaje?: string
          reference_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_emisor_id_fkey"
            columns: ["emisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificaciones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      previas: {
        Row: {
          created_at: string | null
          descripcion: string | null
          icono: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          icono?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          icono?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      profile_stats: {
        Row: {
          friend_count: number | null
          global_rank: number | null
          total_points: number
          user_id: string
        }
        Insert: {
          friend_count?: number | null
          global_rank?: number | null
          total_points?: number
          user_id: string
        }
        Update: {
          friend_count?: number | null
          global_rank?: number | null
          total_points?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allow_friend_requests: boolean
          avatar_url: string | null
          email: string
          fcm_token: string | null
          full_name: string | null
          id: string
          instagram_handle: string | null
          is_admin: boolean
          is_banned: boolean
          is_silenced_by_admin: boolean
          notif_activas: boolean | null
          notif_eventos_actualizados: boolean
          notif_eventos_nuevos: boolean
          notif_ganancia_puntos: boolean
          notif_invitaciones: boolean | null
          notif_ofertas_promos: boolean
          notif_solicitudes_aceptadas: boolean
          notif_solicitudes_amigos: boolean
          profile_visibility: string
          show_stats: boolean
          show_tickets: boolean
          updated_at: string | null
          username: string | null
        }
        Insert: {
          age?: number | null
          allow_friend_requests?: boolean
          avatar_url?: string | null
          email: string
          fcm_token?: string | null
          full_name?: string | null
          id: string
          instagram_handle?: string | null
          is_admin?: boolean
          is_banned?: boolean
          is_silenced_by_admin?: boolean
          notif_activas?: boolean | null
          notif_eventos_actualizados?: boolean
          notif_eventos_nuevos?: boolean
          notif_ganancia_puntos?: boolean
          notif_invitaciones?: boolean | null
          notif_ofertas_promos?: boolean
          notif_solicitudes_aceptadas?: boolean
          notif_solicitudes_amigos?: boolean
          profile_visibility?: string
          show_stats?: boolean
          show_tickets?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          age?: number | null
          allow_friend_requests?: boolean
          avatar_url?: string | null
          email?: string
          fcm_token?: string | null
          full_name?: string | null
          id?: string
          instagram_handle?: string | null
          is_admin?: boolean
          is_banned?: boolean
          is_silenced_by_admin?: boolean
          notif_activas?: boolean | null
          notif_eventos_actualizados?: boolean
          notif_eventos_nuevos?: boolean
          notif_ganancia_puntos?: boolean
          notif_invitaciones?: boolean | null
          notif_ofertas_promos?: boolean
          notif_solicitudes_aceptadas?: boolean
          notif_solicitudes_amigos?: boolean
          profile_visibility?: string
          show_stats?: boolean
          show_tickets?: boolean
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      ranking_config: {
        Row: {
          id: number
          updated_at: string
          puntos_por_entrada: number
          bonus_racha_1: number
          bonus_racha_2: number
          bonus_racha_3: number
          bonus_racha_4_plus: number
          titulo_alma_min: number
          titulo_vip_min: number
          titulo_leyenda_min: number
        }
        Insert: {
          id?: number
          updated_at?: string
          puntos_por_entrada?: number
          bonus_racha_1?: number
          bonus_racha_2?: number
          bonus_racha_3?: number
          bonus_racha_4_plus?: number
          titulo_alma_min?: number
          titulo_vip_min?: number
          titulo_leyenda_min?: number
        }
        Update: {
          id?: number
          updated_at?: string
          puntos_por_entrada?: number
          bonus_racha_1?: number
          bonus_racha_2?: number
          bonus_racha_3?: number
          bonus_racha_4_plus?: number
          titulo_alma_min?: number
          titulo_vip_min?: number
          titulo_leyenda_min?: number
        }
        Relationships: []
      }
      puntos_interes: {
        Row: {
          categoria: string | null
          created_at: string
          descripcion: string | null
          direccion: string | null
          horario: string | null
          id: string
          imagen_url: string | null
          latitud: number
          longitud: number
          nombre: string
          precio: string | null
          web_url: string | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          horario?: string | null
          id?: string
          imagen_url?: string | null
          latitud: number
          longitud: number
          nombre: string
          precio?: string | null
          web_url?: string | null
        }
        Update: {
          categoria?: string | null
          created_at?: string
          descripcion?: string | null
          direccion?: string | null
          horario?: string | null
          id?: string
          imagen_url?: string | null
          latitud?: number
          longitud?: number
          nombre?: string
          precio?: string | null
          web_url?: string | null
        }
        Relationships: []
      }
      silenciados: {
        Row: {
          created_at: string | null
          id: string
          silenced_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          silenced_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          silenced_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "silenciados_silenced_id_fkey"
            columns: ["silenced_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "silenciados_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_provider: { Args: { user_email: string }; Returns: string }
      get_friends_count: { Args: { target_user_id: string }; Returns: number }
      get_friends_of_user: {
        Args: { current_user_id: string; target_user_id: string }
        Returns: {
          avatar_url: string
          id: string
          is_mutual: boolean
          relationship_status: string
          username: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Evento = Database["public"]["Tables"]["eventos"]["Row"]
export type Local = Database["public"]["Tables"]["locales"]["Row"]
export type Bar = Database["public"]["Tables"]["bares"]["Row"]
export type PuntoInteres = Database["public"]["Tables"]["puntos_interes"]["Row"]
export type Notificacion = Database["public"]["Tables"]["notificaciones"]["Row"]
export type Amigo = Database["public"]["Tables"]["amigos"]["Row"]
export type Bloqueado = Database["public"]["Tables"]["bloqueados"]["Row"]
export type Destacado = Database["public"]["Tables"]["destacados"]["Row"]
export type ProfileStats = Database["public"]["Tables"]["profile_stats"]["Row"]
