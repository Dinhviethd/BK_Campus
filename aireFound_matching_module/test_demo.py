"""
Demo & Testing Scripts
Các script để test functionality của matching service
"""
import requests
import json
import time
from uuid import uuid4

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1/matching"


def test_health_check():
    """Test health check endpoint"""
    print("\n" + "="*50)
    print("TEST 1: Health Check")
    print("="*50)
    
    response = requests.get(f"{API_BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    

def test_create_match_request(lost_post_id: str):
    """Test tạo match request"""
    print("\n" + "="*50)
    print("TEST 2: Create Match Request")
    print("="*50)
    
    payload = {
        "lost_post_id": lost_post_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/match-requests",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    if response.status_code == 201:
        return response.json()['request_id']
    return None


def test_get_candidates(request_id: str):
    """Test lấy danh sách candidates"""
    print("\n" + "="*50)
    print("TEST 3: Get Candidates")
    print("="*50)
    
    # Chờ một chút để worker xử lý
    print("Waiting 10 seconds for worker to process...")
    time.sleep(10)
    
    response = requests.get(
        f"{API_BASE_URL}/match-requests/{request_id}/candidates"
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_webhook_new_post(found_post_id: str):
    """Test webhook cho bài FOUND mới"""
    print("\n" + "="*50)
    print("TEST 4: Webhook New FOUND Post")
    print("="*50)
    
    payload = {
        "new_found_post_id": found_post_id
    }
    
    response = requests.post(
        f"{API_BASE_URL}/webhook/new-post",
        json=payload
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def test_cancel_request(request_id: str):
    """Test hủy match request"""
    print("\n" + "="*50)
    print("TEST 5: Cancel Match Request")
    print("="*50)
    
    response = requests.post(
        f"{API_BASE_URL}/match-requests/{request_id}/cancel"
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")


def run_full_flow_test():
    """Chạy full flow test"""
    print("\n" + "🧪 STARTING FULL FLOW TEST")
    print("="*50)
    
    # NOTE: Thay các UUID này bằng UUID thật từ database của bạn
    SAMPLE_LOST_POST_ID = "550e8400-e29b-41d4-a716-446655440000"
    SAMPLE_FOUND_POST_ID = "660e8400-e29b-41d4-a716-446655440001"
    
    # Test 1: Health check
    test_health_check()
    
    # Test 2: Tạo match request
    request_id = test_create_match_request(SAMPLE_LOST_POST_ID)
    
    if request_id:
        # Test 3: Lấy candidates
        test_get_candidates(request_id)
        
        # Test 5: Cancel request
        # test_cancel_request(request_id)
    
    # Test 4: Webhook
    # test_webhook_new_post(SAMPLE_FOUND_POST_ID)
    
    print("\n" + "="*50)
    print("✅ ALL TESTS COMPLETED")
    print("="*50)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "health":
            test_health_check()
        elif command == "create" and len(sys.argv) > 2:
            test_create_match_request(sys.argv[2])
        elif command == "webhook" and len(sys.argv) > 2:
            test_webhook_new_post(sys.argv[2])
        elif command == "candidates" and len(sys.argv) > 2:
            test_get_candidates(sys.argv[2])
        elif command == "cancel" and len(sys.argv) > 2:
            test_cancel_request(sys.argv[2])
        else:
            print("Usage:")
            print("  python test_demo.py health")
            print("  python test_demo.py create <lost_post_id>")
            print("  python test_demo.py webhook <found_post_id>")
            print("  python test_demo.py candidates <request_id>")
            print("  python test_demo.py cancel <request_id>")
    else:
        # Run full flow test
        run_full_flow_test()
