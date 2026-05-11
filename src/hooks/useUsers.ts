"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { usersService } from "@/services";
import type {
  User,
  UserFilters,
  PaginatedUsers,
  CreateUserRequest,
  UpdateUserRequest,
} from "@/types";

export function useUsers() {
  const [users, setUsers] = useState<PaginatedUsers | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async (filters: UserFilters = {}) => {
    setIsLoading(true);
    try {
      const data = await usersService.getAll(filters);
      setUsers(data);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      const text = Array.isArray(msg) ? msg.join(" · ") : typeof msg === "string" ? msg : null;
      console.error("[fetchUsers]", status, msg, err);
      toast.error(text ? `Error ${status ?? ""}: ${text}` : "Error al cargar los usuarios");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUser = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const data = await usersService.getById(id);
      setUser(data);
      return data;
    } catch {
      toast.error("Usuario no encontrado");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createUser = async (payload: CreateUserRequest) => {
    setIsSubmitting(true);
    try {
      const data = await usersService.create(payload);
      toast.success("Usuario creado exitosamente");
      return data;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Error al crear el usuario";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateUser = async (id: string, payload: UpdateUserRequest) => {
    setIsSubmitting(true);
    try {
      const data = await usersService.update(id, payload);
      toast.success("Usuario actualizado exitosamente");
      return data;
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Error al actualizar el usuario";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await usersService.delete(id);
      toast.success("Usuario eliminado");
      setUsers((prev) =>
        prev
          ? { ...prev, data: prev.data.filter((u) => u.id !== id) }
          : prev
      );
    } catch {
      toast.error("Error al eliminar el usuario");
    }
  };

  return {
    users,
    user,
    isLoading,
    isSubmitting,
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
  };
}
