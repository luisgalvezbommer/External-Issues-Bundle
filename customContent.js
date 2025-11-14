document.addEventListener('show.bs.modal', (e) => {
    const desc = e.target.querySelector('#timesheet_edit_form_description');
    const activitySelect = e.target.querySelector('#timesheet_edit_form_activity');

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
         * Get cache statistics for monitoring
         */
        function getCacheStats() {
            const now = Date.now();
            let activeEntries = 0;
            let expiredEntries = 0;

            clientCache.forEach((value) => {
                if (now - value.timestamp < CACHE_DURATION_MS) {
                    activeEntries++;
                } else {
                    expiredEntries++;
                }
            });

            return {
                totalEntries: clientCache.size,
                activeEntries: activeEntries,
                expiredEntries: expiredEntries,
                maxSize: MAX_CACHE_SIZE
            };
        }

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
            const startTime = performance.now();
            const cacheKey = queryString.toLowerCase().trim();

            // Check client-side cache first
            const cached = clientCache.get(cacheKey);
            const now = Date.now();

            if (cached && (now - cached.timestamp < CACHE_DURATION_MS)) {
                const cacheAge = Math.round((now - cached.timestamp) / 1000);
                const fetchTime = performance.now() - startTime;

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
                    console.log('[AutoComplete] Data items received:', issueData.length);


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

        function closeAllLists(element) {
            const items = document.getElementsByClassName("autocomplete-items");
            for (let i = 0; i < items.length; i++) {
                if (element != items[i] && element != desc) {
                    items[i].parentNode.removeChild(items[i]);
                }
            }
        }

        function createAutocomplete(issueData) {
            if (!issueData || issueData.length === 0) {
                closeAllLists();
                return;
            }

            closeAllLists();
            currentFocus = -1;

            autocompleteList = document.createElement("div");
            autocompleteList.setAttribute("class", "autocomplete-items");
            autocompleteList.style.cssText = `
                position: absolute;
                border: 1px solid #d4d4d4;
                border-top: none;
                z-index: 99;
                background: white;
                max-height: 200px;
                min-width: 400px;
                overflow-y: auto;
            `;
            desc.parentNode.appendChild(autocompleteList);

            for (let i = 0; i < issueData.length; i++) {
                const item = document.createElement("div");
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
                    const input = this.getElementsByTagName("input")[0];

                    const key = input.getAttribute('issueData-key');
                    const value = input.getAttribute('issueData-value');

                    const endpoint = input.getAttribute('issueData-issue-endpoint');


                    desc.value = endpoint;
                    closeAllLists();
                    validateDescription();
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

        // Autocomplete input event with debouncing and minimum 3 characters
        desc.addEventListener("input", function () {
            const queryString = desc.value;

            // Clear existing timer
            clearTimeout(debounceTimer);

            // Close autocomplete if less than 3 characters
            if (!queryString || queryString.length < 3) {
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
            let items = autocompleteList ? autocompleteList.getElementsByTagName("div") : [];
            if (e.keyCode == 40) { // DOWN arrow
                currentFocus++;
                addActive(items);
            } else if (e.keyCode == 38) { // UP arrow
                currentFocus--;
                addActive(items);
            } else if (e.keyCode == 13) { // ENTER
                e.preventDefault();
                if (currentFocus > -1 && items) {
                    items[currentFocus].click();
                }
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

        document.addEventListener("click", function (e) {
            closeAllLists(e.target);
        });

        // Validation function - ONLY for exampleActivity
        function validateDescription() {
            // Change pattern as needed
            const pattern = /^youtrack:[A-Z]+-[0-9]+$/;
            const value = desc.value.trim();

            let exampleActivity = false;

            // Check if exampleActivity is selected
            if (activitySelect.tomselect) {
                const selectedValue = activitySelect.tomselect.getValue();
                const selectedOption = activitySelect.tomselect.options[selectedValue];

                if (selectedOption) {
                    const optionText = selectedOption.text || selectedOption.name || '';
                    exampleActivity = optionText.trim() === 'exampleActivity';
                }
            }

            // Validation ONLY applies when 'exampleActivity' is selected
            if (exampleActivity && value !== '' && !pattern.test(value)) {
                desc.setCustomValidity('exampleActivity needs format "youtrack:PROJEKT-123"');
                desc.style.borderColor = 'red';
                desc.reportValidity();
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