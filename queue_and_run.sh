#!/bin/bash

QUEUE_DIR="/var/queue/jobs"
LOCK_FILE="/var/lock/myjob.lock"
JOB_SCRIPT="/app/get-sites.sh"
MAX_QUEUE_SIZE=2
LOG_TAG="[Job Queue]"

# Predefined list of random names
NAMES=("Alpha" "Bravo" "Charlie" "Delta" "Echo" "Foxtrot" "Golf" "Hotel" "India" "Juliet" "Kilo" "Lima" "Mike" "November" "Oscar" "Papa" "Quebec" "Romeo" "Sierra" "Tango" "Uniform" "Victor" "Whiskey" "X-ray" "Yankee" "Zulu")

# Capture the reason for triggering the script (either cron or manual)
TRIGGER_REASON=${1:-"cron"}

# Function to log messages with timestamp
log_message() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_TAG $message" >> /proc/1/fd/1 2>> /proc/1/fd/2
}

# Function to get a unique random name
get_unique_name() {
    local name
    while true; do
        name="${NAMES[RANDOM % ${#NAMES[@]}]}"
        # Check if the name is already used in the queue
        if [ ! -f "${QUEUE_DIR}/${name}.sh" ]; then
            echo "$name"
            return
        fi
    done
}

# Get a unique job name
JOB_NAME=$(get_unique_name)
JOB_FILE="${QUEUE_DIR}/${JOB_NAME}.sh"

# Check the current number of jobs in the queue
QUEUE_COUNT=$(ls -1q "${QUEUE_DIR}"/*.sh 2>/dev/null | wc -l)

# Add the job to the queue if it's not full
if [ "$QUEUE_COUNT" -ge "$MAX_QUEUE_SIZE" ]; then
    log_message "Queue is full (max $MAX_QUEUE_SIZE jobs). Job not added. Triggered by: $TRIGGER_REASON."
    exit 1
fi

# Add the job to the queue
mkdir -p "${QUEUE_DIR}"
touch "${JOB_FILE}"
echo "#!/bin/bash" > "${JOB_FILE}"
echo "${JOB_SCRIPT}" >> "${JOB_FILE}"
chmod +x "${JOB_FILE}"

log_message "Job '${JOB_NAME}' added to queue. Current queue size: $((QUEUE_COUNT + 1)). Reason: $TRIGGER_REASON."

# Check if the lock is acquired
(
    flock -n 200 || {
        log_message "Another job is currently running. Job '${JOB_NAME}' added to queue. Current queue size: $((QUEUE_COUNT + 1)). Reason: $TRIGGER_REASON."
        exit 1
    }

    log_message "Run started for job '${JOB_NAME}'. Triggered by: $TRIGGER_REASON."

    # Process the job queue
    for JOB in "${QUEUE_DIR}"/*.sh; do
        if [[ -f "$JOB" ]]; then
            log_message "Executing job: $JOB (started from queue)"
            # Run the job
            bash "$JOB"
            log_message "Job completed: $JOB (from queue)"
            # Remove the job from the queue after execution
            rm -f "$JOB"
        fi
    done

    log_message "Run completed for job '${JOB_NAME}'."
) 200>"${LOCK_FILE}" # Lock file descriptor

