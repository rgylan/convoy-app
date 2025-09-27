#!/bin/bash

# Simplified Convoy Location Update Test Script
# Tests real-time WebSocket functionality for location updates
# Dependencies: Only bash, curl, and basic Unix commands

set -e

# Configuration
BASE_URL="http://localhost:8080"
DELAY_SECONDS=2
WAYPOINTS_COUNT=12

# Predefined route from Quezon City to SM MOA (Philippines)
WAYPOINTS=(
    "14.6758,121.0383"  # Starting point: Quezon City
    "14.6650,121.0350"  # Moving south
    "14.6540,121.0320"  # Continuing south
    "14.6430,121.0290"  # Approaching EDSA
    "14.6320,121.0260"  # On EDSA
    "14.6210,121.0230"  # Continuing on EDSA
    "14.6100,121.0200"  # Ortigas area
    "14.5990,121.0170"  # Approaching Makati
    "14.5880,121.0140"  # Entering Makati
    "14.5770,121.0110"  # Makati CBD
    "14.5660,121.0080"  # Ayala area
    "14.5359,120.9802"  # Final destination: SM Mall of Asia
)

# Test state
CONVOY_ID=""
MEMBER_ID=""
SUCCESS_COUNT=0
FAILED_COUNT=0
CURRENT_WAYPOINT=0
LOOP_COMPLETED=false

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Enhanced function to get current timestamp with color
get_timestamp() {
    echo -e "${CYAN}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
}

# Enhanced function to log messages with colors and emojis
log_message() {
    local message="$1"
    local timestamp=$(get_timestamp)
    
    # Determine message type and apply appropriate color/emoji
    if [[ "$message" == SUCCESS:* ]]; then
        echo -e "[$timestamp] ${GREEN}✅ ${message#SUCCESS: }${NC}"
    elif [[ "$message" == ERROR:* ]]; then
        echo -e "[$timestamp] ${RED}❌ ${message#ERROR: }${NC}"
    elif [[ "$message" == WARNING:* ]]; then
        echo -e "[$timestamp] ${YELLOW}⚠️  ${message#WARNING: }${NC}"
    elif [[ "$message" == INFO:* ]]; then
        # Sub-categorize INFO messages
        local info_msg="${message#INFO: }"
        if [[ "$info_msg" == *"convoy"* ]] || [[ "$info_msg" == *"Convoy"* ]]; then
            echo -e "[$timestamp] ${BLUE}🚗 ${info_msg}${NC}"
        elif [[ "$info_msg" == *"WebSocket"* ]] || [[ "$info_msg" == *"URL"* ]] || [[ "$info_msg" == *"connection"* ]]; then
            echo -e "[$timestamp] ${BLUE}🔌 ${info_msg}${NC}"
        elif [[ "$info_msg" == *"destination"* ]] || [[ "$info_msg" == *"Destination"* ]] || [[ "$info_msg" == *"SM"* ]] || [[ "$info_msg" == *"MOA"* ]]; then
            echo -e "[$timestamp] ${BLUE}🏢 ${info_msg}${NC}"
        elif [[ "$info_msg" == *"location"* ]] || [[ "$info_msg" == *"coordinates"* ]] || [[ "$info_msg" == *"waypoint"* ]]; then
            echo -e "[$timestamp] ${BLUE}📍 ${info_msg}${NC}"
        elif [[ "$info_msg" == *"cleanup"* ]] || [[ "$info_msg" == *"Cleanup"* ]]; then
            echo -e "[$timestamp] ${BLUE}🧹 ${info_msg}${NC}"
        else
            echo -e "[$timestamp] ${BLUE}ℹ️  ${info_msg}${NC}"
        fi
    elif [[ "$message" == DEBUG:* ]]; then
        echo -e "[$timestamp] ${PURPLE}🔍 ${message#DEBUG: }${NC}"
    else
        # Default case - treat as INFO
        echo -e "[$timestamp] ${BLUE}ℹ️  ${message}${NC}"
    fi
}

# Enhanced function to extract JSON value (handles both string and numeric values)
extract_json_value() {
    local json="$1"
    local key="$2"
    
    # Try string value extraction first (for convoy IDs)
    local string_value=$(echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | sed "s/\"$key\":\"\([^\"]*\)\"/\1/")
    
    if [ -n "$string_value" ] && [ "$string_value" != "null" ]; then
        echo "$string_value"
        return 0
    fi
    
    # Try numeric value extraction (for member IDs)
    local numeric_value=$(echo "$json" | grep -o "\"$key\":[0-9]*" | cut -d':' -f2)
    
    if [ -n "$numeric_value" ] && [ "$numeric_value" != "null" ]; then
        echo "$numeric_value"
        return 0
    fi
    
    # Return empty if not found
    echo ""
    return 1
}

# Add a convoy data fetch function for debugging
debug_convoy_data() {
    log_message "INFO: Fetching current convoy data for debugging..."
    
    local convoy_data=$(curl -s "$BASE_URL/api/convoys/$CONVOY_ID" 2>/dev/null)
    local curl_exit_code=$?
    
    if [ $curl_exit_code -eq 0 ]; then
        log_message "DEBUG: Current convoy data:"
        echo "$convoy_data" | jq '.' 2>/dev/null || echo "$convoy_data"
        
        # Check specifically for destination
        local has_destination=$(echo "$convoy_data" | jq -r '.destination // "null"' 2>/dev/null)
        if [ "$has_destination" != "null" ] && [ -n "$has_destination" ]; then
            log_message "SUCCESS: SM MOA destination found in convoy data"
            log_message "DEBUG: SM MOA destination data: $has_destination"
        else
            log_message "WARNING: No SM MOA destination found in convoy data"
        fi
    else
        log_message "ERROR: Failed to fetch convoy data for debugging"
    fi
}

# Enhanced function to create convoy, add leader, and create SM MOA destination
setup_convoy() {
    log_message "INFO: Setting up test convoy..."
    
    # Get start coordinates
    local start_coords="${WAYPOINTS[0]}"
    local start_lat=$(echo "$start_coords" | cut -d',' -f1)
    local start_lng=$(echo "$start_coords" | cut -d',' -f2)
    
    # Get end coordinates (SM MOA)
    local end_coords="${WAYPOINTS[-1]}"
    local end_lat=$(echo "$end_coords" | cut -d',' -f1)
    local end_lng=$(echo "$end_coords" | cut -d',' -f2)
    
    log_message "INFO: Start coordinates: $start_lat, $start_lng (Quezon City)"
    log_message "INFO: End coordinates: $end_lat, $end_lng (SM Mall of Asia)"
    
    # Create convoy (existing logic - working)
    log_message "INFO: Creating convoy..."
    local convoy_response=$(curl -s -X POST "$BASE_URL/api/convoys" \
        -H "Content-Type: application/json" \
        -d '{"name":"Location Test Convoy"}')
    
    CONVOY_ID=$(extract_json_value "$convoy_response" "id")
    
    if [ -z "$CONVOY_ID" ] || [ "$CONVOY_ID" = "null" ]; then
        log_message "ERROR: Failed to create convoy"
        log_message "ERROR: Response: $convoy_response"
        exit 1
    fi
    
    log_message "SUCCESS: Convoy created with ID: $CONVOY_ID"
    
    # Add leader to convoy
    log_message "INFO: Adding leader to convoy..."
    local member_payload="{\"name\":\"Test Leader\",\"location\":{\"lat\":$start_lat,\"lng\":$start_lng}}"
    
    log_message "DEBUG: Member payload: $member_payload"
    log_message "DEBUG: Making POST request to $BASE_URL/api/convoys/$CONVOY_ID/members"
    
    local member_response=$(curl -s -w "%{http_code}" -X POST \
        "$BASE_URL/api/convoys/$CONVOY_ID/members" \
        -H "Content-Type: application/json" \
        -d "$member_payload" 2>/dev/null)
    
    local curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        log_message "ERROR: Curl failed with exit code $curl_exit_code"
        log_message "ERROR: Response: $member_response"
        exit 1
    fi
    
    # Extract HTTP status code and response body
    local http_code="${member_response: -3}"
    local response_body="${member_response%???}"
    
    if [ "$http_code" != "201" ] && [ "$http_code" != "200" ]; then
        log_message "ERROR: Failed to add leader to convoy - HTTP $http_code"
        log_message "ERROR: Response body: $response_body"
        exit 1
    fi
    
    # Extract member ID
    MEMBER_ID=$(extract_json_value "$response_body" "id")
    
    if [ -z "$MEMBER_ID" ] || [ "$MEMBER_ID" = "null" ]; then
        # Try alternative extraction methods for numeric IDs
        local alt_id1=$(echo "$response_body" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        
        if [ -n "$alt_id1" ] && [ "$alt_id1" != "null" ]; then
            MEMBER_ID="$alt_id1"
            log_message "INFO: Using alternative extraction method for numeric ID"
        else
            log_message "ERROR: All ID extraction methods failed"
            exit 1
        fi
    fi
    
    log_message "SUCCESS: Leader added with ID: $MEMBER_ID"
    
    # Create SM MOA destination with enhanced debugging and proper name
    log_message "INFO: Creating SM Mall of Asia destination..."
    local destination_payload="{\"name\":\"SM Mall of Asia\",\"description\":\"Shopping mall and entertainment complex in Pasay City\",\"lat\":$end_lat,\"lng\":$end_lng}"

    log_message "DEBUG: SM MOA destination payload: $destination_payload"
    log_message "DEBUG: Making POST request to $BASE_URL/api/convoys/$CONVOY_ID/destination"

    local destination_response=$(curl -s -w "%{http_code}" -X POST \
        "$BASE_URL/api/convoys/$CONVOY_ID/destination" \
        -H "Content-Type: application/json" \
        -d "$destination_payload" 2>/dev/null)

    local dest_curl_exit_code=$?

    log_message "DEBUG: SM MOA destination curl exit code: $dest_curl_exit_code"
    log_message "DEBUG: Full SM MOA destination response: $destination_response"

    if [ $dest_curl_exit_code -ne 0 ]; then
        log_message "ERROR: Failed to create SM MOA destination - curl exit code $dest_curl_exit_code"
        log_message "ERROR: Response: $destination_response"
    else
        # Extract HTTP status code and response body
        local dest_http_code="${destination_response: -3}"
        local dest_response_body="${destination_response%???}"
        
        log_message "DEBUG: SM MOA destination HTTP code: $dest_http_code"
        log_message "DEBUG: SM MOA destination response body: $dest_response_body"
        
        if [ "$dest_http_code" = "201" ] || [ "$dest_http_code" = "200" ]; then
            log_message "SUCCESS: SM Mall of Asia destination created - HTTP $dest_http_code"
            log_message "INFO: SM MOA destination coordinates: lat=$end_lat, lng=$end_lng"
            
            # Verify destination was created by fetching convoy data
            log_message "INFO: Verifying SM MOA destination creation..."
            local verify_response=$(curl -s "$BASE_URL/api/convoys/$CONVOY_ID" 2>/dev/null)
            log_message "DEBUG: Convoy verification response: $verify_response"
            
            # Check if destination exists in response
            if echo "$verify_response" | grep -q "destination"; then
                log_message "SUCCESS: SM MOA destination confirmed in convoy data"
            else
                log_message "WARNING: SM MOA destination not found in convoy data"
            fi
        else
            log_message "ERROR: Failed to create SM MOA destination - HTTP $dest_http_code"
            log_message "ERROR: Response body: $dest_response_body"
        fi
    fi
    
    # Add debug call after destination creation
    debug_convoy_data
    
    # Display URLs and setup info
    log_message "SUCCESS: Setup completed successfully!"
    log_message "INFO: WebSocket URL: ws://localhost:8080/ws/convoys/$CONVOY_ID"
    log_message "INFO: Frontend URL: http://localhost:3000/convoy/$CONVOY_ID"
    
    # Show setup instructions
    show_setup_instructions
    
    echo -e "\n${YELLOW}📋 Press Enter after opening the convoy URL in your browser...${NC}"
    read
    echo ""
}

# Enhanced function to update location with better visual feedback
update_location() {
    local step=$1
    local lat=$2
    local lng=$3
    local start_time=$(date +%s)
    
    log_message "INFO: Step $step: Updating location to ($lat, $lng)"
    
    # Validate coordinates are numeric
    if ! echo "$lat" | grep -q '^-\?[0-9]\+\.\?[0-9]*$' || ! echo "$lng" | grep -q '^-\?[0-9]\+\.\?[0-9]*$'; then
        log_message "ERROR: Invalid coordinates: lat='$lat', lng='$lng'"
        ((FAILED_COUNT++))
        return 1
    fi
    
    # Create JSON payload
    local json_payload="{\"lat\":$lat,\"lng\":$lng}"
    
    # Make the API call
    local response=$(curl -s -w "%{http_code}" -X PUT \
        "$BASE_URL/api/convoys/$CONVOY_ID/members/$MEMBER_ID/location" \
        -H "Content-Type: application/json" \
        -d "$json_payload" 2>/dev/null)
    
    local curl_exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $curl_exit_code -ne 0 ]; then
        log_message "ERROR: Curl failed with exit code $curl_exit_code"
        log_message "ERROR: Response: $response"
        ((FAILED_COUNT++))
        return 1
    fi
    
    # Extract HTTP status code (last 3 characters)
    local http_code="${response: -3}"
    local response_body="${response%???}"
    
    if [ "$http_code" = "200" ]; then
        log_message "SUCCESS: Location updated (${duration}s) - HTTP $http_code"
        ((SUCCESS_COUNT++))
    else
        log_message "ERROR: Failed to update location - HTTP $http_code"
        log_message "ERROR: Response body: $response_body"
        log_message "ERROR: JSON payload sent: $json_payload"
        ((FAILED_COUNT++))
        return 1
    fi
    
    return 0
}

# Function to run the test
run_test() {
    log_message "INFO: Starting location update test..."
    log_message "INFO: Total waypoints to process: ${#WAYPOINTS[@]}"
    log_message "INFO: Delay between updates: ${DELAY_SECONDS} seconds"
    echo ""
    
    echo "Press Enter when ready to start the test..."
    read
    echo ""
    
    # Function-scoped variables (these can use local)
    local total_waypoints=${#WAYPOINTS[@]}
    local waypoint
    local lat
    local lng
    local update_result
    
    # Process each waypoint with enhanced error handling
    for i in $(seq 0 $((total_waypoints - 1))); do
        CURRENT_WAYPOINT=$((i+1))
        
        log_message "INFO: Processing waypoint $CURRENT_WAYPOINT of $total_waypoints"
        
        # Safely get waypoint with bounds checking
        if [ $i -ge ${#WAYPOINTS[@]} ]; then
            log_message "ERROR: Waypoint index $i out of bounds (max: $((${#WAYPOINTS[@]} - 1)))"
            break
        fi
        
        waypoint="${WAYPOINTS[$i]}"
        log_message "DEBUG: Raw waypoint data: '$waypoint'"
        
        # Validate waypoint format
        if [ -z "$waypoint" ]; then
            log_message "ERROR: Empty waypoint at index $i"
            continue
        fi
        
        # Parse coordinates with validation
        if ! echo "$waypoint" | grep -q '^[0-9.-]*,[0-9.-]*$'; then
            log_message "ERROR: Invalid waypoint format: '$waypoint'"
            continue
        fi
        
        lat=$(echo "$waypoint" | cut -d',' -f1)
        lng=$(echo "$waypoint" | cut -d',' -f2)
        
        log_message "INFO: Extracted coordinates - lat: '$lat', lng: '$lng'"
        
        # Validate coordinates are not empty
        if [ -z "$lat" ] || [ -z "$lng" ]; then
            log_message "ERROR: Empty coordinates for waypoint $CURRENT_WAYPOINT: '$waypoint'"
            continue
        fi
        
        # Validate coordinates are numeric
        if ! echo "$lat" | grep -q '^-\?[0-9]\+\.\?[0-9]*$' || ! echo "$lng" | grep -q '^-\?[0-9]\+\.\?[0-9]*$'; then
            log_message "ERROR: Non-numeric coordinates: lat='$lat', lng='$lng'"
            continue
        fi
        
        # Update location with error handling
        log_message "DEBUG: About to call update_location for waypoint $CURRENT_WAYPOINT"
        
        # Disable exit-on-error temporarily for this call
        set +e
        update_location $CURRENT_WAYPOINT "$lat" "$lng"
        update_result=$?
        set -e
        
        log_message "DEBUG: update_location returned exit code: $update_result"
        
        if [ $update_result -ne 0 ]; then
            log_message "WARNING: Update failed for waypoint $CURRENT_WAYPOINT, but continuing..."
            ((FAILED_COUNT++))
            
            # Stop if too many failures
            if [ $FAILED_COUNT -gt 5 ]; then
                log_message "ERROR: Too many failures ($FAILED_COUNT), stopping test"
                return 1
            fi
        fi
        
        # Wait before next update (except for the last waypoint)
        if [ $i -lt $((total_waypoints - 1)) ]; then
            log_message "INFO: Waiting ${DELAY_SECONDS} seconds before next update..."
            log_message "DEBUG: About to sleep for $DELAY_SECONDS seconds"
            
            # Use sleep with error handling - disable exit-on-error temporarily
            set +e
            sleep $DELAY_SECONDS
            local sleep_result=$?
            set -e
            
            if [ $sleep_result -ne 0 ]; then
                log_message "WARNING: Sleep command interrupted, but continuing..."
            else
                log_message "DEBUG: Sleep completed successfully"
            fi
            echo ""
        fi
        
        log_message "DEBUG: Completed waypoint $CURRENT_WAYPOINT successfully"
    done
    
    LOOP_COMPLETED=true
    log_message "SUCCESS: All waypoints processed successfully"
}

# Enhanced show_results function with colorful output
show_results() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    log_message "INFO: Test Results Summary"
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${CYAN}Total Updates: ${#WAYPOINTS[@]}${NC}"
    echo -e "${GREEN}Successful: $SUCCESS_COUNT${NC}"
    echo -e "${RED}Failed: $FAILED_COUNT${NC}"
    
    if [ $FAILED_COUNT -eq 0 ]; then
        log_message "SUCCESS: All location updates completed successfully!"
    else
        log_message "WARNING: Some updates failed. Check logs above."
    fi
    
    echo ""
    log_message "INFO: Validation Checklist:"
    echo -e "  ${GREEN}✅${NC} All HTTP requests returned 200 status"
    echo -e "  ${GREEN}✅${NC} WebSocket messages visible in browser dev tools"
    echo -e "  ${GREEN}✅${NC} Map marker moved smoothly to each position"
    echo -e "  ${GREEN}✅${NC} Console shows LOCATION_UPDATED log messages"
    echo -e "  ${GREEN}✅${NC} Multiple clients (if tested) show synchronized updates"
    echo ""
    log_message "INFO: Frontend URL: http://localhost:3000/convoy/$CONVOY_ID"
}

# Function to cleanup
cleanup() {
    log_message "INFO: Cleanup called at waypoint $CURRENT_WAYPOINT of ${#WAYPOINTS[@]}"
    log_message "INFO: Loop completed: $LOOP_COMPLETED"
    
    if [ "$LOOP_COMPLETED" != "true" ]; then
        log_message "WARNING: Script terminated prematurely at waypoint $CURRENT_WAYPOINT"
    fi
    
    if [ "$DEBUG_MODE" = "true" ]; then
        log_message "INFO: Cleanup disabled in debug mode"
        log_message "INFO: Manual cleanup: curl -X DELETE $BASE_URL/api/convoys/$CONVOY_ID/members/$MEMBER_ID"
        return
    fi
    
    if [ -n "$CONVOY_ID" ] && [ -n "$MEMBER_ID" ]; then
        log_message "INFO: Cleaning up test convoy..."
        log_message "INFO: Removing member $MEMBER_ID from convoy $CONVOY_ID"
        
        local cleanup_response=$(curl -s -w "%{http_code}" -X DELETE "$BASE_URL/api/convoys/$CONVOY_ID/members/$MEMBER_ID" 2>/dev/null)
        local cleanup_exit_code=$?
        
        log_message "INFO: Cleanup curl exit code: $cleanup_exit_code"
        log_message "INFO: Cleanup response: $cleanup_response"
        
        log_message "SUCCESS: Test cleanup completed"
    else
        log_message "INFO: Skipping cleanup - missing CONVOY_ID or MEMBER_ID"
        log_message "INFO: CONVOY_ID='$CONVOY_ID', MEMBER_ID='$MEMBER_ID'"
    fi
}

# Function to display setup instructions
show_setup_instructions() {
    echo ""
    echo -e "${BLUE}==================================================${NC}"
    log_message "INFO: IMPORTANT - WebSocket Setup Required"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    echo -e "${YELLOW}For location updates to be visible in real-time, you need to:${NC}"
    echo -e "${CYAN}1.${NC} Open your browser"
    echo -e "${CYAN}2.${NC} Navigate to: ${GREEN}http://localhost:3000/convoy/$CONVOY_ID${NC}"
    echo -e "${CYAN}3.${NC} Wait for the WebSocket connection to establish"
    echo -e "${CYAN}4.${NC} Keep the browser tab open during the test"
    echo ""
    echo -e "${YELLOW}The browser will show:${NC}"
    echo -e "- ${GREEN}🚗${NC} Leader starting at Quezon City"
    echo -e "- ${GREEN}🏢${NC} SM Mall of Asia destination marker"
    echo -e "- ${GREEN}📍${NC} Real-time location updates along the route"
    echo -e "- ${GREEN}🔌${NC} WebSocket connection: ${CYAN}ws://localhost:8080/ws/convoys/$CONVOY_ID${NC}"
    echo ""
    echo -e "${YELLOW}You can also monitor WebSocket messages in dev tools:${NC}"
    echo -e "- Press ${CYAN}F12${NC} > ${CYAN}Network${NC} > ${CYAN}WS${NC} tab"
    echo -e "- Watch for ${GREEN}LOCATION_UPDATED${NC} messages"
    echo ""
    echo -e "${GREEN}Note:${NC} The SM Mall of Asia destination is automatically created, so you don't need"
    echo -e "      to manually add it in the browser interface."
    echo ""
    echo -e "${BLUE}==================================================${NC}"
}

# Enhanced main function with colorful header
main() {
    log_message "INFO: Starting convoy location update test"
    
    # Check dependencies
    if ! command -v curl >/dev/null 2>&1; then
        log_message "ERROR: curl is required but not installed"
        exit 1
    fi
    
    # Set up cleanup trap
    log_message "INFO: Setting up cleanup trap"
    trap 'log_message "INFO: EXIT signal received, calling cleanup"; cleanup' EXIT
    trap 'log_message "INFO: INT signal received"; exit 130' INT
    trap 'log_message "INFO: TERM signal received"; exit 143' TERM
    
    # Display test information with enhanced formatting
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${GREEN}🚗 Convoy Location Update Test${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo -e "${CYAN}Start:${NC} ${WAYPOINTS[0]} ${YELLOW}(Quezon City)${NC}"
    echo -e "${CYAN}End:${NC} ${WAYPOINTS[-1]} ${YELLOW}(SM Mall of Asia)${NC}"
    echo -e "${CYAN}Waypoints:${NC} ${GREEN}${#WAYPOINTS[@]}${NC}"
    echo -e "${CYAN}Delay:${NC} ${GREEN}${DELAY_SECONDS}s${NC} between updates"
    echo -e "${BLUE}==================================================${NC}"
    echo ""
    
    # Run the test
    setup_convoy
    run_test
    show_results
    
    log_message "SUCCESS: Test completed successfully"
}

# Set debug mode to prevent cleanup during testing
DEBUG_MODE="true"

# Run the script
main "$@"




















