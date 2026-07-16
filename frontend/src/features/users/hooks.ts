"use client";

import { useQuery } from "@tanstack/react-query";
import { usersApi } from "./api";

export function useAdminUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: usersApi.findAll,
  });
}
