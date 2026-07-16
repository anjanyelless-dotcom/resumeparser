import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import UsersPage from "../UsersPage";
import { useUserStore } from "../../store/useUserStore";

// Mock the user store
jest.mock("../../store/useUserStore");

describe("UsersPage", () => {
  beforeEach(() => {
    (useUserStore as jest.Mock).mockReturnValue({
      users: [
        {
          id: "1",
          email: "admin@example.com",
          role: "admin",
          is_active: true,
          tenant_id: "default",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          email: "recruiter@example.com",
          role: "recruiter",
          is_active: true,
          tenant_id: "default",
          created_at: "2024-01-02T00:00:00Z",
        },
      ],
      total: 2,
      isLoading: false,
      error: null,
      fetchUsers: jest.fn(),
      deleteUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
    });
  });

  it("renders user management page", () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Manage user accounts and permissions")).toBeInTheDocument();
  });

  it("displays users table", () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
    expect(screen.getByText("recruiter@example.com")).toBeInTheDocument();
  });

  it("shows total users count", () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/Total users: 2/)).toBeInTheDocument();
  });

  it("displays role badges", () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("admin")).toBeInTheDocument();
    expect(screen.getByText("recruiter")).toBeInTheDocument();
  });

  it("displays status badges", () => {
    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("calls fetchUsers on mount", () => {
    const { fetchUsers } = (useUserStore as jest.Mock)().result.current;

    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(fetchUsers).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    (useUserStore as jest.Mock).mockReturnValue({
      users: [],
      total: 0,
      isLoading: true,
      error: null,
      fetchUsers: jest.fn(),
      deleteUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
    });

    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    (useUserStore as jest.Mock).mockReturnValue({
      users: [],
      total: 0,
      isLoading: false,
      error: "Failed to fetch users",
      fetchUsers: jest.fn(),
      deleteUser: jest.fn(),
      activateUser: jest.fn(),
      deactivateUser: jest.fn(),
    });

    render(
      <BrowserRouter>
        <UsersPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Failed to fetch users")).toBeInTheDocument();
  });
});
