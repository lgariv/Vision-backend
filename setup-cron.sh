#!/bin/bash

# Create a temporary file for the new crontab
temp_crontab="/tmp/crontab.tmp"

# Get the current crontab
crontab -l > "$temp_crontab" 2>/dev/null

# Check if any environment variables are already present
if grep -q '^ *[A-Za-z_][A-Za-z0-9_]*=' "$temp_crontab"; then
    echo "Environment variables already present in crontab. No changes made."
else
    # Add environment variables to the beginning of the crontab
    {
        echo "# Environment Variables"
        printenv | sed 's/^//' # Just print the variables, no export
        cat "$temp_crontab"
    } > "$temp_crontab.new"

    # Install the new crontab
    crontab "$temp_crontab.new"
    echo "Updated crontab with environment variables."

    # Clean up temporary files
    rm "$temp_crontab" "$temp_crontab.new"
fi
