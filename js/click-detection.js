document.addEventListener("DOMContentLoaded", () => {
    if (!easyReviewData.enable_reviews) {
        return;
    }

    let annotations = [...easyReviewData.saved_annotations];

    const annotationList = document.querySelector(".er_annotation_list");
    const annotationListItems = document.querySelector(".er_annotation_list_items");
    const annotationListToggle = document.querySelector(".er_annotation_list_toggle");
    const editingAnnotationIds = new Set();

    let easyReviewOn = false;

    let departmentColors = easyReviewData.department_colors;

    let adminBarDepartments = document.querySelectorAll(".ez-review-department-option");

    let currentReview = "general";

    adminBarDepartments.forEach(department => {
        department.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            currentReview = department.id.replace("wp-admin-bar-ez_review_", "");
        });
    });

   let ticking = false;

    window.addEventListener("scroll", () => {
        if (!easyReviewOn || ticking) return;

        ticking = true;

        requestAnimationFrame(() => {
            syncAnnotations();
            ticking = false;
        });
    });

    let resizeTimeout;

    window.addEventListener("resize", () => {
        if (!easyReviewOn) return;

        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(() => {
            syncAnnotations();
        }, 100);
    });

    function syncAnnotations() {
        annotations.forEach(data => {
            if (editingAnnotationIds.has(data.id)) return;

            const target = getAnnotationTarget(data);
            if (!target) return;

            let annotation = document.getElementById(data.id);

            if (!annotation) {
                renderAnnotation(data, false);
                return;
            }

            positionAnnotation(annotation, data);
        });
    }

    function getAnnotationLayer() {
        let layer = document.querySelector(".er_annotation_layer");

        if (!layer) {
            layer = document.createElement("div");
            layer.className = "er_annotation_layer";
            document.body.appendChild(layer);
        }

        return layer;
    }


    startEZReview();

    let ezReviewToggle = document.querySelector(".ez_review_admin_btn [title='Start/Stop Easy Review']");
    // let ezReviewIndicator = document.querySelector(".er_review_indicator");

    ezReviewToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        easyReviewOn = !easyReviewOn;

        if(easyReviewOn) {
            // ezReviewIndicator.style.display = "block";
            annotationList.style.display = "flex";
            document.body.classList.toggle("easy-review-active", easyReviewOn);

            buildAnnotationList();

            setTimeout(syncAnnotations, 300);
            setTimeout(syncAnnotations, 1000);
        } else {
            annotationList.style.display = "none";
            // ezReviewIndicator.style.display = "none";
            document.body.classList.toggle("easy-review-active", easyReviewOn);
            annotations.forEach(annotation => {
                document.querySelector(annotation.selector)?.style.setProperty("outline", "none");
            });
            document.querySelectorAll(".er_annotation_number_tag").forEach(tag => tag.remove());
        }
        
        startEZReview();
    }); 
        document.addEventListener("click", (e) => {
            if(!easyReviewOn) {
                return;
            }
            // Prevent a tags from following href when clicked
            const link = e.target.closest("a");

            if (link && !link.closest(".er_annotation_list")) {
                e.preventDefault();
            }
            // Prevent annotation form from being created when clicking these elements
            if (e.target.closest(".er_review_form_close")) return;
            if (e.target.closest(".er_review_form_wrapper")) return;
            if (e.target.closest(".er_annotation")) return;
            if (e.target.closest(".er_review_toggle")) return;
            if (e.target.closest("#wpadminbar")) return;
            if (e.target.closest(".er_annotation_list")) return;
            const formWrapper = createInputForm(e);
            document.body.appendChild(formWrapper);
            // Check if form is overflowing out of viewport and move back to fit if needed
            const formOverflowCheck = checkElementOverflow(formWrapper);
            if (formOverflowCheck.isOutside) {
                if(formOverflowCheck.right > 0) {
                    formWrapper.style.left = (e.pageX - formOverflowCheck.right) + "px";
                }
                if (formOverflowCheck.bottom > 0) {
                    formWrapper.style.top = (e.pageY - formOverflowCheck.bottom) + "px";
                }
            }
        });

        function checkElementOverflow(el) {
            const elementRect = el.getBoundingClientRect();
            const vWidth = document.documentElement.clientWidth;
            const vHeight = document.documentElement.clientHeight;

            return {
                // Amount outside top (px)
                top: elementRect.top < 0 ? Math.abs(elementRect.top) : 0,
                // Amount outside bottom (px)
                bottom: elementRect.bottom > vHeight ? elementRect.bottom - vHeight : 0,
                // Amount outside left (px)
                left: elementRect.left < 0 ? Math.abs(elementRect.left) : 0,
                // Amount outside right (px)
                right: elementRect.right > vWidth ? elementRect.right - vWidth : 0,
                // Boolean check
                isOutside: elementRect.top < 0 || elementRect.left < 0 || elementRect.bottom > vHeight || elementRect.right > vWidth
            };
        }

        function startEZReview() {
            document.querySelectorAll(".er_annotation, .er_review_form_wrapper").forEach(el => {
                el.remove();
            });

            document.querySelectorAll(".er_annotation_number_tag").forEach(tag => {
                tag.remove();
            });

            document.querySelectorAll(
                ".er_annotation, .er_review_form_wrapper, .er_annotation_anchor"
            ).forEach(el => {
                el.remove();
            });

            if (!easyReviewOn) return;

            annotations.forEach(renderAnnotationAnchor);
            annotations.forEach(annotation => renderAnnotation(annotation, false));
        }

        function createInputForm(event) {

            document.querySelectorAll(".er_review_form_wrapper").forEach(el => el.remove());

            const wrapper = document.createElement("div");

            wrapper.className = "er_review_form_wrapper";
            wrapper.style.left = event.pageX + "px";
            wrapper.style.top = event.pageY + "px";

            wrapper.innerHTML = `
                <div class="er_review_form_close"><img src="${easyReviewData.close_svg}" alt="close icon" class="er_annotation_close_form_icon"></div>
                <form class="er_review_form">
                    <textarea rows="3" cols="40" name="review" placeholder="Enter note"></textarea>
                    <select name="department">
                        <option value="copy" ${currentReview === "copy" ? "selected" : ""}>Copy</option>
                        <option value="design" ${currentReview === "design" ? "selected" : ""}>Design</option>
                        <option value="development" ${currentReview === "development" ? "selected" : ""}>Development</option>
                        <option value="general" ${currentReview === "general" ? "selected" : ""}>General</option>
                    </select>
                    <button type="submit">Add</button>
                </form>
            `;

            const form = wrapper.querySelector(".er_review_form");

            form.addEventListener("submit", async (e) => {

                e.preventDefault();

                const rect = event.target.getBoundingClientRect();

                const annotation = {
                    id: crypto.randomUUID(),
                    text: form.review.value,
                    department: form.department.value,
                    selector: getElementSelector(event.target),
                    fallbackSelector: getElementSelector(getAnnotationVisualParent(event.target)),
                    offsetXPercent: (event.clientX - rect.left) / rect.width,
                    offsetYPercent: (event.clientY - rect.top) / rect.height,
                    pageX: event.pageX,
                    pageY: event.pageY,
                    dateCreated: getFormattedDateTime(),
                    resolution: getScreenSize()
                };

                annotations.push(annotation);

                addAnnotationToList(annotation, annotations.length);

                renderAnnotationAnchor(annotation);

                renderAnnotation(annotation, true);

                wrapper.remove();

                // Save to backend
                await saveAnnotation(annotation);
                
            });

            const formClose = wrapper.querySelector(".er_review_form_close");

            formClose.addEventListener("click", async (e) => {
                e.stopPropagation();
                wrapper.remove();
            });

            return wrapper;
        }

        function getScreenSize() {
            const screenSize = `${window.innerWidth} x ${window.innerHeight}`;
            return screenSize;
        }

        function renderAnnotationAnchor(data) {
            if (document.getElementById("anchor-" + data.id)) return;

            const marker = document.createElement("div");
            marker.id = "anchor-" + data.id;
            marker.className = "er_annotation_anchor";

            marker.style.position = "absolute";
            marker.style.left = (data.pageX || 0) + "px";
            marker.style.top = (data.pageY || 0) + "px";
            marker.style.width = "1px";
            marker.style.height = "1px";
            marker.style.pointerEvents = "none";
            marker.style.opacity = "0";

            document.body.appendChild(marker);
        }

        function renderAnnotation(data, newAnnotation) {
            const target = getAnnotationTarget(data);

            if (!target) return;

            target.style.outline = `solid 1px ${departmentColors[data.department]}`;

            const annotationListNumber = annotations.findIndex(annotation => annotation.id === data.id) + 1;

            const elementAnnotationNumberTag = document.createElement("div");
            elementAnnotationNumberTag.classList.add("er_annotation_number_tag");
            elementAnnotationNumberTag.style.backgroundColor = departmentColors[data.department];
            elementAnnotationNumberTag.textContent = annotationListNumber;
            const tagParent = target.matches("img, svg, picture")
                ? target.parentElement
                : target;

            tagParent.appendChild(elementAnnotationNumberTag);

            // Listen for when annotation tag number is visible and then show annotation
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        document.getElementById(data.id).style.display = "block";
                        syncAnnotations();
                    } else {
                        document.getElementById(data.id).style.display = "none";
                        syncAnnotations();
                    }
                });
            }, {
                threshold: 0.1
            });

            observer.observe(elementAnnotationNumberTag);

            const annotation = document.createElement("div");
            annotation.className = "er_annotation";
            annotation.id = data.id;
            annotation.style.borderColor = departmentColors[data.department] || "#fff";

            annotation.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            annotation.innerHTML = `
                <div class="er_annotation_options_container">
                    <div class="er_annotation_date_popup">${data.dateCreated}</div>
                    <div class="er_annotation_number" style="background-color: ${departmentColors[data.department]}">${annotationListNumber}</div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_date"><img src="${easyReviewData.clock_svg}" alt="clock icon" class="er_annotation_clock_icon"></div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_edit"><img src="${easyReviewData.edit_svg}" alt="edit icon" class="er_annotation_edit_icon"></div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_minimize"><img src="${easyReviewData.minimize_svg}" alt="minimize icon" class="er_annotation_minimize_icon"></div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_close"><img src="${easyReviewData.trash_svg}" alt="close icon" class="er_annotation_close_icon"></div>
                </div>
            `;

            annotation.querySelector(".er_annotation_date").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const datePopup = annotation.querySelector(".er_annotation_date_popup");

                datePopup.classList.toggle("er_annotation_date_popup_active");
            });

            const annotationText = document.createElement("p");
            annotationText.textContent = data.text;
            annotation.appendChild(annotationText);

            getAnnotationLayer().appendChild(annotation);

            if (newAnnotation && data.pageX !== undefined && data.pageY !== undefined) {
                annotation.style.left = data.pageX + "px";
                annotation.style.top = data.pageY + "px";
            } else {
                positionAnnotation(annotation, data);
            }

            // addAnnotationToList(data, annotationListNumber);

            annotation.querySelector(".er_annotation_edit_icon").addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                editingAnnotationIds.add(data.id);

                const annotationRect = annotation.getBoundingClientRect();

                annotation.remove();

                const editFormWrapper = createEditInputForm(data);

                editFormWrapper.style.left = window.scrollX + annotationRect.left + "px";
                editFormWrapper.style.top = window.scrollY + annotationRect.top + "px";

                document.body.appendChild(editFormWrapper);
            });

            annotation.querySelector(".er_annotation_minimize_icon").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                const icon = e.currentTarget;

                icon.classList.toggle("minimized");

                const annotationTools = icon.closest(".er_annotation");

                if (icon.classList.contains("minimized")) {

                    icon.src = easyReviewData.maximize_svg;
                    icon.alt = "maximize icon";

                    annotationTools.classList.add("er_annotation_minimized");
                    annotationTools.querySelector("p").style.display = "none";

                } else {

                    icon.src = easyReviewData.minimize_svg;
                    icon.alt = "minimize icon";

                    annotationTools.classList.remove("er_annotation_minimized");
                    annotationTools.querySelector("p").style.display = "block";
                }
            });

            annotation.querySelector(".er_annotation_close").addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Removes annotation form annotation array
                annotations = annotations.filter(item => item.id !== data.id);
                target.style.outline = "none";
                target.querySelector(".er_annotation_number_tag")?.remove();
                annotation.remove();
                buildAnnotationList();

                await deleteAnnotation(data.id);
            });
        }

        function positionAnnotation(annotation, data) {
            const target = getAnnotationTarget(data);

            if (!target) return;

            const rect = target.getBoundingClientRect();

            const x = data.offsetXPercent !== undefined
                ? rect.width * data.offsetXPercent
                : data.offsetX || 0;

            const y = data.offsetYPercent !== undefined
                ? rect.height * data.offsetYPercent
                : data.offsetY || 0;

            // const annotationOffsetY = 12;

            const left = window.scrollX + rect.left + x;

            const top =
                window.scrollY +
                rect.bottom

            if (Number.isNaN(left) || Number.isNaN(top)) {
                return;
            }

            annotation.style.left = left + "px";
            annotation.style.top = top + "px";

            const marker = document.getElementById("anchor-" + data.id);

            if (marker) {
                marker.style.left = left + "px";
                marker.style.top = top + "px";
            }
        }
        function buildAnnotationList() {
            annotationListItems?.querySelectorAll(".er_annotation_list_item").forEach(item => {
                item.remove();
            });

            listAnnotationsIDs = [];

            annotations.forEach((data, index) => {
                addAnnotationToList(data, index + 1);
            });
        }

        let listAnnotationsIDs = [];
        
        function addAnnotationToList(data, listNumber) {
            if(listAnnotationsIDs.find(id => id === data.id)) {
                return;
            }
            const listAnnotation = document.createElement("div");
            listAnnotation.classList.add("er_annotation_list_item");
            listAnnotation.innerHTML = `
                <a href="#anchor-${data.id}" class="er_annotation_list_item_link">
                    <div class="er_annotation_list_item_number er_annotation_number" style="background-color: ${departmentColors[data.department]}">
                        ${listNumber}
                    </div>
                    <div class="er_annotation_list_item_text">
                        <p class="er_annotation_list_item_review">${data.text}</p>
                        <p class="er_annotation_list_item_date">${data.dateCreated}</p>
                        <p class="er_annotation_list_item_date">${data.resolution}</p>
                    </div>
                    <img class="er_annotation_list_item_close" src="${easyReviewData.trash_svg}" alt="close icon">
                </a>
            `;

            listAnnotationsIDs.push(data.id);

            listAnnotation.querySelector(".er_annotation_list_item_close").addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const target = getAnnotationTarget(data);
                const annotation = document.getElementById(data.id);
                const anchor = document.getElementById("anchor-" + data.id);

                annotations = annotations.filter(item => item.id !== data.id);

                target?.style.setProperty("outline", "none");
                target?.querySelector(".er_annotation_number_tag")?.remove();

                annotation?.remove();
                anchor?.remove();

                buildAnnotationList();

                await deleteAnnotation(data.id);
            });

            annotationListItems?.appendChild(listAnnotation);
        }

        function createEditInputForm(oldAnnotation) {
            const target = getAnnotationTarget(oldAnnotation);

            if (!target) return document.createElement("div");

            const targetRect = target.getBoundingClientRect();

            const wrapper = document.createElement("div");
            wrapper.className = "er_review_form_wrapper";
            wrapper.style.left =
                window.scrollX +
                targetRect.left +
                (targetRect.width * oldAnnotation.offsetXPercent) +
                "px";

            wrapper.style.top =
                window.scrollY +
                targetRect.top +
                (targetRect.height * oldAnnotation.offsetYPercent) +
                "px";

            wrapper.innerHTML = `
                <div class="er_review_form_close"><img src="${easyReviewData.close_svg}" alt="close icon" class="er_annotation_close_form_icon"></div>
                <form class="er_review_form">
                    <textarea rows="3" cols="40" name="review" placeholder="Enter note">${oldAnnotation.text}</textarea>
                    <select name="department">
                        <option value="copy" ${oldAnnotation.department === "copy" ? "selected" : ""}>Copy</option>
                        <option value="design" ${oldAnnotation.department === "design" ? "selected" : ""}>Design</option>
                        <option value="development" ${oldAnnotation.department === "development" ? "selected" : ""}>Development</option>
                        <option value="general" ${oldAnnotation.department === "general" ? "selected" : ""}>General</option>
                    </select>
                    <button type="submit">Save</button>
                </form>
            `;

            const form = wrapper.querySelector(".er_review_form");

            form.addEventListener("submit", async (e) => {
                e.preventDefault();

                const updatedAnnotation = {
                    id: crypto.randomUUID(),
                    text: form.review.value,
                    department: form.department.value,
                    selector: oldAnnotation.selector,
                    fallbackSelector : oldAnnotation.fallbackSelector,
                    offsetXPercent: oldAnnotation.offsetXPercent,
                    offsetYPercent: oldAnnotation.offsetYPercent,
                    pageX: oldAnnotation.pageX,
                    pageY: oldAnnotation.pageY,
                    dateCreated: getFormattedDateTime(),
                    resolution: getScreenSize()
                };

                annotations = annotations.filter(item => item.id !== oldAnnotation.id);
                annotations.push(updatedAnnotation);

                editingAnnotationIds.delete(oldAnnotation.id);

                wrapper.remove();

                document.getElementById(oldAnnotation.id)?.remove();
                document.getElementById("anchor-" + oldAnnotation.id)?.remove();
                target?.querySelector(".er_annotation_number_tag")?.remove();

                renderAnnotationAnchor(updatedAnnotation);
                renderAnnotation(updatedAnnotation);

                await deleteAnnotation(oldAnnotation.id);
                await saveAnnotation(updatedAnnotation);

                buildAnnotationList();
            });

            wrapper.querySelector(".er_review_form_close").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                editingAnnotationIds.delete(oldAnnotation.id);

                wrapper.remove();
                renderAnnotation(oldAnnotation);
            });

            return wrapper;
        }

        async function saveAnnotation(annotation) {

            await fetch(easyReviewData.ajax_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    action: "save_annotation",
                    storage_key: easyReviewData.storage_key,
                    annotation: JSON.stringify(annotation)
                })
            });
        }

        async function deleteAnnotation(id) {

            await fetch(easyReviewData.ajax_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: new URLSearchParams({
                    action: "delete_annotation",
                    storage_key: easyReviewData.storage_key,
                    annotation_id: id
                })
            });
        }

        function getAnnotationVisualParent(target) {
            if (!target) return null;

            // Elements that shouldn't contain annotation children
            if (
                target.matches(
                    "img, svg, picture, video, canvas, iframe, input, textarea, select, button"
                )
            ) {
                return target.parentElement;
            }

            return target;
        }

        function getAnnotationTarget(data) {
            return document.querySelector(data.selector) ||
                document.querySelector(data.fallbackSelector);
        }

        function getElementSelector(el) {
            if (el.id) {
                return `#${CSS.escape(el.id)}`;
            }

            const path = [];

            while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
                let selector = el.nodeName.toLowerCase();

                if (el.className) {
                    const classes = [...el.classList].map(cls => `.${CSS.escape(cls)}`).join("");
                    selector += classes;
                }

                const parent = el.parentNode;
                const siblings = [...parent.children].filter(child => child.nodeName === el.nodeName);

                if (siblings.length > 1) {
                    selector += `:nth-of-type(${siblings.indexOf(el) + 1})`;
                }

                path.unshift(selector);
                el = parent;
            }

            return path.join(" > ");
        }

        // Annotation List
        annotationListToggle.addEventListener("click", (e) => {
            if (annotationListToggle.classList.contains("list-closed")) {
                annotationListToggle.parentElement.style.width = "250px";
                annotationListToggle.classList.remove("list-closed");
            } else {
                annotationListToggle.classList.add("list-closed");
                annotationListToggle.parentElement.style.width = "0";
            }
        });

        annotationList.addEventListener("click", (e) => {
            const link = e.target.closest(".er_annotation_list_item_link");
            if (!link) return;

            e.preventDefault();

            const annotationId = link
            .getAttribute("href")
            .replace("#anchor-", "");
            const data = annotations.find(item => item.id === annotationId);

            if (!data) return;

            const marker = document.getElementById("anchor-" + annotationId);

            if (!marker) return;

            marker.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            setTimeout(syncAnnotations, 700);

            setTimeout(() => {
                syncAnnotations();

                const annotation = document.getElementById(data.id);

                if (annotation) {
                    annotation.classList.add("er_annotation_highlight");

                    setTimeout(() => {
                        annotation.classList.remove("er_annotation_highlight");
                    }, 1200);
                }
            }, 500);
        });

        function getFormattedDateTime() {
            const now = new Date();

            const month = now.getMonth() + 1;
            const day = now.getDate();

            let hours = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, "0");

            const ampm = hours >= 12 ? "pm" : "am";

            hours = hours % 12;
            hours = hours ? hours : 12;

            return `${month}/${day} ${hours}:${minutes}${ampm}`;
        }

        console.log(getFormattedDateTime());
});