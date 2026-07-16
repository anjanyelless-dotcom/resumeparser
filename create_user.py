import requests
import sys
import getpass

def create_user():
    print("=== Create New User ===")
    email = input("Email: ").strip()
    
    # Hide password input
    password = getpass.getpass("Password: ").strip()
    
    print("\nRoles available: admin, recruiter, viewer")
    role = input("Role (default: recruiter): ").strip().lower()
    if not role:
        role = "recruiter"
        
    print("\nCreating user...")
    try:
        response = requests.post(
            'http://localhost:3001/api/auth/register',
            json={
                'email': email,
                'password': password,
                'role': role
            }
        )
        
        if response.status_code == 201:
            print("✅ User created successfully!")
            print(f"Email: {email}")
            print(f"Role: {role}")
        elif response.status_code == 409:
            print("❌ Error: A user with this email already exists.")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to the backend server. Is it running on port 3001?")

if __name__ == "__main__":
    create_user()
