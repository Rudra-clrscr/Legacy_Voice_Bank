import os
import sys
from dotenv import load_dotenv

# Load dotenv from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from supabase import create_client

def test_connection():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    
    print("Testing Supabase connection...")
    print(f"URL: {url}")
    print(f"Service Key present: {'Yes' if key else 'No'}")
    
    if not url or not key:
        print("[FAIL] Missing Supabase URL or Service Key. Check your .env file.")
        return False
        
    try:
        supabase = create_client(url, key)
        # Try to fetch from profiles table as a test
        # Note: If the table living_legacy migration has not been run, this might fail, which is a good test!
        print("Fetching from profiles table...")
        resp = supabase.table("profiles").select("*").limit(1).execute()
        print("[SUCCESS] Connected to Supabase and queried 'profiles' table successfully.")
        print(f"Sample Profile Data: {resp.data}")
        return True
    except Exception as e:
        print(f"[FAIL] Error querying database: {e}")
        print("Please ensure you have run the scripts/living_legacy_migration.sql script in your Supabase SQL Editor.")
        return False

if __name__ == "__main__":
    test_connection()
