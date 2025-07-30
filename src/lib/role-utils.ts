import { auth } from "@/app/auth";
import { redirect } from "next/navigation";

export type UserRole = "SUPERADMIN" | "ADMIN";

/**
 * Checks if the current user has the required role(s)
 * @param requiredRoles - Single role or array of roles that are allowed
 * @returns A boolean indicating if the user has access
 */
export async function hasRole(requiredRoles: UserRole | UserRole[]): Promise<boolean> {
  const session = await auth();
  
  if (!session || !session.user) {
    return false;
  }
  
  const userRole = session.user.role;
  
  if (Array.isArray(requiredRoles)) {
    return requiredRoles.includes(userRole as UserRole);
  }
  
  return userRole === requiredRoles;
}

/**
 * Middleware to protect routes based on user roles
 * @param requiredRoles - Single role or array of roles that are allowed
 */
export async function requireRole(requiredRoles: UserRole | UserRole[]) {
  const hasAccess = await hasRole(requiredRoles);
  
  if (!hasAccess) {
    redirect("/dashboard"); // Redirect to dashboard or unauthorized page
  }
}
