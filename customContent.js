document.addEventListener('show.bs.modal', (e) => {
    const desc = e.target.querySelector('#timesheet_edit_form_description');
    const activitySelect = e.target.querySelector('#timesheet_edit_form_activity');

    //=========================================================================
    // Configuration Autocomplete
    const MIN_QUERY_LENGTH = 4; // min query length to trigger autocomplete

    // Configuration Validation
    const validatedActivities = ['exampleActivity', 'anotherActivity']; // Activities that require validation
    const VALIDATION_PATTERN = /^(youtrack:|https:\/\/youtrack.example.com\/issues\/)[A-Z]+-[0-9]+(\n.*)*$/
    const VALIDATION_MESSAGE = 'validateActivity needs format "youtrack:PROJEKT-123" or "https://youtrack.example.com/issues/PROJEKT-123"'

    //=========================================================================

    if (desc !== null && activitySelect !== null) {
        desc.required = true;
        const label = e.target.querySelector('label[for=timesheet_edit_form_description]');
        if (label !== null && !label.classList.contains('required')) {
            label.classList.add('required');
        }

        // Client-side cache for autocomplete issueData
        const clientCache = new Map();
        const CACHE_DURATION_MS = 60000; // 60 seconds
        const MAX_CACHE_SIZE = 50; // Prevent memory issues

        /**
         * Clean up expired cache entries
         */
        function cleanupExpiredCache() {
            const now = Date.now();
            let removedCount = 0;

            clientCache.forEach((value, key) => {
                if (now - value.timestamp >= CACHE_DURATION_MS) {
                    clientCache.delete(key);
                    removedCount++;
                }
            });
        }

        /**
         * Manage cache size to prevent memory issues
         */
        function enforceCacheLimit() {
            if (clientCache.size > MAX_CACHE_SIZE) {
                // Remove oldest entries (FIFO)
                const entriesToRemove = clientCache.size - MAX_CACHE_SIZE;
                const iterator = clientCache.keys();

                for (let i = 0; i < entriesToRemove; i++) {
                    const oldestKey = iterator.next().value;
                    clientCache.delete(oldestKey);
                }


            }
        }

        // Fetch autocomplete suggestions from API with client-side caching
        function fetchAutocompleteData(queryString) {
            const cacheKey = queryString.toLowerCase().trim();

            // Check client-side cache first
            const cached = clientCache.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
                return Promise.resolve(cached.issueData);
            }
            // Fetch from API if not in cache
            const endpoint = `/api/external/issues?search=${encodeURIComponent(queryString)}`;
            console.log('[AutoComplete] Fetching from endpoint:', endpoint);

            return fetch(endpoint)
                .then(response => {
                    return response.json();
                })
                .then(apiResponse => {
                    const issueData = apiResponse.issueData || [];

                    // Store in client cache
                    clientCache.set(cacheKey, {
                        issueData: issueData,
                        timestamp: Date.now(),
                        query: queryString
                    });

                    // Cleanup and enforce limits
                    cleanupExpiredCache();
                    enforceCacheLimit();

                    return issueData;

                })
                .catch(error => {
                    console.error('[AutoComplete] Error loading autocomplete issueData:', error);
                    return [];
                });
        }

        let currentFocus = -1;
        let autocompleteList;
        let debounceTimer;

        // Create autocomplete container once
        autocompleteList = document.createElement("div");
        autocompleteList.setAttribute("id", "autocomplete-items");
        autocompleteList.style.cssText = `
            position: absolute;
            border: 1px solid #d4d4d4;
            border-top: none;
            z-index: 99;
            background: white;
            max-height: 200px;
            min-width: 400px;
            overflow-y: auto;
            visibility: hidden;
        `;
        desc.parentNode.appendChild(autocompleteList);

        function closeAllLists() {
            if (autocompleteList.style.visibility === 'visible' && autocompleteList.innerHTML !== '') {
                autocompleteList.style.visibility = 'hidden';
                autocompleteList.innerHTML = '';
            }
        }

        function createAutocomplete(issueData) {
            if (!issueData || issueData.length === 0) {
                closeAllLists();
                return;
            }

            // Clear existing items and reset focus
            autocompleteList.innerHTML = '';
            currentFocus = -1;

            // Show the autocomplete list
            autocompleteList.style.visibility = 'visible';

            for (let i = 0; i < issueData.length; i++) {
                const item = document.createElement("div");
                item.setAttribute("class", "autocomplete-item");
                item.style.cssText = `
                    padding: 10px;
                    cursor: pointer;
                    border-bottom: 1px solid #d4d4d4;
                `;

                // Show "key - value"
                item.innerHTML = `<strong>${issueData[i].key}</strong> - ${issueData[i].value}`;

                // Store the ID, value, and issue-endpoint in hidden inputs
                item.innerHTML += `<input type='hidden' issueData-key='${issueData[i].key}' issueData-value='${issueData[i].value}' issueData-issue-endpoint='${issueData[i].issueUrl}'>`;

                item.addEventListener("click", function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (typeof e.stopImmediatePropagation === 'function') {
                        e.stopImmediatePropagation();
                    }
                    selectItem(this);
                });

                item.addEventListener("mouseenter", function () {
                    this.style.backgroundColor = "#e9e9e9";
                });

                item.addEventListener("mouseleave", function () {
                    this.style.backgroundColor = "";
                });

                autocompleteList.appendChild(item);
            }
        }

        // Autocomplete input event with debouncing and pattern matching
        desc.addEventListener("input", function () {
            const queryString = desc.value;

            // Clear existing timer
            clearTimeout(debounceTimer);

            // Close autocomplete if pattern doesn't match
            if (!queryString || queryString.length < MIN_QUERY_LENGTH) {
                closeAllLists();
                validateDescription();
                return;
            }

            // Wait 500ms before fetching
            debounceTimer = setTimeout(() => {
                fetchAutocompleteData(queryString)
                    .then(filteredData => {
                        createAutocomplete(filteredData);
                        validateDescription();
                    });
            }, 500);
        });

        // Keyboard navigation for autocomplete
        desc.addEventListener("keydown", function (e) {
            if (autocompleteList.style.visibility !== 'visible') return;

            const items = document.getElementsByClassName("autocomplete-item");
            if (!items || items.length === 0) return;

            if (e.keyCode == 40) { // DOWN arrow
                currentFocus++;
                addActive(items);
            } else if (e.keyCode == 38) { // UP arrow
                currentFocus--;
                addActive(items);
            } else if (e.keyCode == 13) { // ENTER
                e.preventDefault();
                if (currentFocus > -1 && items && items[currentFocus]) {
                    selectItem(items[currentFocus]);
                }
            }
        });

        // Close autocomplete when clicking outside
        document.addEventListener("click", function (e) {
            if (e.target !== desc && !autocompleteList.contains(e.target)) {
                closeAllLists();
            }
        });


        function addActive(items) {
            if (!items) return false;
            removeActive(items);
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = (items.length - 1);
            items[currentFocus].style.backgroundColor = "#e9e9e9";
        }

        function removeActive(items) {
            for (let i = 0; i < items.length; i++) {
                items[i].style.backgroundColor = "";
            }
        }

        // Apply selected item's endpoint to the description and close list
        function selectItem(element) {
            if (!element) { return; }
            const input = element.getElementsByTagName("input")[0];
            if (!input) { return; }

            const endpoint = input.getAttribute('issueData-issue-endpoint');
            if (endpoint) {
                desc.value = endpoint;
                closeAllLists();
                validateDescription();
            }
        }


        // Validation function
        function validateDescription() {
            // Change pattern as needed
            const pattern = VALIDATION_PATTERN;
            const value = desc.value.trim();

            let validateActivity = false;

            // Check if validateActivity is true
            if (activitySelect.tomselect) {
                const selectedValue = activitySelect.tomselect.getValue();
                const selectedOption = activitySelect.tomselect.options[selectedValue];

                if (selectedOption) {
                    const optionText = selectedOption.text || selectedOption.name || '';
                    validateActivity = validatedActivities.includes(optionText.trim());
                }
            }

            // Validation ONLY applies when validatedActivities includes selected Activity
            if (validateActivity && value !== '' && !pattern.test(value)) {
                desc.setCustomValidity(VALIDATION_MESSAGE);
                desc.style.borderColor = 'red';
                if (autocompleteList.style.visibility === 'hidden' && autocompleteList.innerHTML !== '') {
                    desc.reportValidity();
                }
            } else {
                desc.setCustomValidity('');
                desc.style.borderColor = '';
            }
        }

        // Validation on blur
        desc.addEventListener('blur', validateDescription);

        // Validation when activity changes
        if (activitySelect.tomselect) {
            activitySelect.tomselect.on('change', validateDescription);
        } else {
            activitySelect.addEventListener('change', validateDescription);
        }
    }
});