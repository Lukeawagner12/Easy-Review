document.addEventListener("DOMContentLoaded", () => {

    let annotations = [...easyReviewData.saved_annotations];

    const annotationList = document.querySelector(".er_annotation_list");
    const annotationListToggle = document.querySelector(".er_annotation_list_toggle");

    let easyReviewOn = false;

    let departmentColors = {
        "copy": "blue",
        "design": "red",
        "development": "green",
        "general": "gray"
    }

    let adminBarDepartments = document.querySelectorAll(".ez-review-department-option");

    let currentReview = "general";

    adminBarDepartments.forEach(department => {
        department.addEventListener("click", (e) => {
            e.preventDefault();
            currentReview = department.id.replace("wp-admin-bar-ez_review_", "");
        });
    });

    // Force annotations to reposition once elements become visible/rendered --> Fixes issue of annotations not longing on initial page load below the fold
    let renderTimeout;

    window.addEventListener("scroll", () => {
        if (!easyReviewOn) return;

        clearTimeout(renderTimeout);

        renderTimeout = setTimeout(() => {
            startEZReview();
        }, 50);
    });

    // Force annotations to reposition on window resizing
    window.addEventListener("resize", () => {
        if (!easyReviewOn) return;

        clearTimeout(renderTimeout);

        renderTimeout = setTimeout(() => {
            startEZReview();
        }, 50);
    });


    startEZReview();

    let ezReviewToggle = document.querySelector(".ez_review_admin_btn [title='Start/Stop Easy Review']");
    let ezReviewIndicator = document.querySelector(".er_review_indicator");

    ezReviewToggle.addEventListener("click", () => {
        easyReviewOn = !easyReviewOn;

        if(easyReviewOn) {
            ezReviewIndicator.style.display = "block";
            annotationList.style.display = "flex";
        } else {
            ezReviewIndicator.style.display = "none";
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

            if (!easyReviewOn) return;

            annotations.forEach(annotation => renderAnnotation(annotation, false));
        }

        function createInputForm(event) {

            document.querySelectorAll(".er_review_form_wrapper").forEach(el => el.remove());

            const wrapper = document.createElement("div");

            wrapper.className = "er_review_form_wrapper";
            wrapper.style.left = event.pageX + "px";
            wrapper.style.top = event.pageY + "px";

            wrapper.innerHTML = `
                <div class="er_review_form_close">X</div>
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
                    offsetX: event.clientX - rect.left,
                    offsetY: event.clientY - rect.top
                };

                annotations.push(annotation);

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

        function renderAnnotation(data, newAnnotation) {
            const target = document.querySelector(data.selector);

            if (!target) return;

            let annotationParent = target;

            if (target.tagName.toLowerCase() === "img" || target.tagName.toLowerCase() === "svg") {
                annotationParent = target.parentElement;
            }

            if (!annotationParent) return;

            if (getComputedStyle(annotationParent).position === "static") {
                annotationParent.style.position = "relative";
            }

            target.style.outline = `solid 1px ${departmentColors[data.department]}`;

            const elementAnnotationNumberTag = document.createElement("div");
            elementAnnotationNumberTag.classList.add("er_annotation_number_tag");
            elementAnnotationNumberTag.style.backgroundColor = departmentColors[data.department];
            const annotationListNumber = annotations.findIndex(annotation => annotation.id === data.id) + 1;
            elementAnnotationNumberTag.textContent = annotationListNumber;

            target.appendChild(elementAnnotationNumberTag);

            const targetRect = target.getBoundingClientRect();
            const parentRect = annotationParent.getBoundingClientRect();

            const annotation = document.createElement("div");
            annotation.className = "er_annotation";
            annotation.id = data.id;

            annotation.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
            });

            annotation.style.left = (targetRect.left - parentRect.left + data.offsetX) + "px";
            annotation.style.top = (targetRect.top - parentRect.top + data.offsetY) + "px";

            annotation.style.borderColor = departmentColors[data.department] || "#fff";

            annotation.innerHTML = `
                <div class="er_annotation_options_container">
                    <div class="er_annotation_number" style="background-color: ${departmentColors[data.department]}">${annotationListNumber}</div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_edit">Edit</div>
                    <div class="er_annotation_divider"></div>
                    <div class="er_annotation_close">X</div>
                </div>
                
                
            `;

            const annotationText = document.createElement("p");
            annotationText.textContent = data.text;

            annotation.appendChild(annotationText);

            annotationParent.appendChild(annotation);

            // Push annotation to list
            addAnnotationToList(data, annotationListNumber);

            // Check if annotation is overflowing out of viewport and move back to fit if needed
            // Check if this is the initial creation of the annotation, otherwise don't check (prevents annotations from being rendered at bottom of viewport on page reload)
            console.log(newAnnotation);
            if (newAnnotation) {
                const annotationOverflowCheck = checkElementOverflow(annotation);
                if (annotationOverflowCheck.isOutside) {
                    if (annotationOverflowCheck.right > 0) {
                        annotation.style.left = (parseFloat(annotation.style.left) - 12 /* half with of the close button */- annotationOverflowCheck.right) + "px";
                    }

                    if (annotationOverflowCheck.bottom > 0) {
                        annotation.style.top = (parseFloat(annotation.style.top) - annotationOverflowCheck.bottom) + "px";
                    }
                }
            }

            annotation.querySelector(".er_annotation_edit").addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                annotation.remove();

                const editFormWrapper = createEditInputForm(data);
                document.body.appendChild(editFormWrapper);
                // Check if form is overflowing out of viewport and move back to fit if needed
                const formOverflowCheck = checkElementOverflow(editFormWrapper);
                if (formOverflowCheck.isOutside) {
                    if(formOverflowCheck.right > 0) {
                        editFormWrapper.style.left = (e.pageX - formOverflowCheck.right) + "px";
                    }
                    if (formOverflowCheck.bottom > 0) {
                        editFormWrapper.style.top = (e.pageY - formOverflowCheck.bottom) + "px";
                    }
                }
            });

            annotation.querySelector(".er_annotation_close").addEventListener("click", async (e) => {
                e.preventDefault();
                e.stopPropagation();

                annotations = annotations.filter(item => item.id !== data.id);
                target.style.outline = "none";
                target.querySelector(".er_annotation_number_tag")?.remove();
                annotation.remove();

                await deleteAnnotation(data.id);
            });
        }

        function addAnnotationToList(data, listNumber) {
            const listAnnotation = document.createElement("div");
            listAnnotation.classList.add("er_annotation_list_item");
            listAnnotation.innerHTML = `
                <a href="#${data.id}" class="er_annotation_list_item_link">
                    <div class="er_annotation_list_item_number er_annotation_number" style="background-color: ${departmentColors[data.department]}">
                        ${listNumber}
                    </div>
                    <div class="er_annotation_list_item_text">
                        <p>${data.text}</p>
                    </div>
                </a>
            `;

            annotationList.appendChild(listAnnotation);
        }

        function createEditInputForm(oldAnnotation) {
            const target = document.querySelector(oldAnnotation.selector);

            if (!target) return document.createElement("div");

            const targetRect = target.getBoundingClientRect();

            const wrapper = document.createElement("div");
            wrapper.className = "er_review_form_wrapper";
            wrapper.style.left = window.scrollX + targetRect.left + oldAnnotation.offsetX + "px";
            wrapper.style.top = window.scrollY + targetRect.top + oldAnnotation.offsetY + "px";

            wrapper.innerHTML = `
                <div class="er_review_form_close">X</div>
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
                    offsetX: oldAnnotation.offsetX,
                    offsetY: oldAnnotation.offsetY
                };

                annotations = annotations.filter(item => item.id !== oldAnnotation.id);
                annotations.push(updatedAnnotation);

                wrapper.remove();

                renderAnnotation(updatedAnnotation);

                deleteAnnotation(oldAnnotation.id);
                saveAnnotation(updatedAnnotation);
            });

            wrapper.querySelector(".er_review_form_close").addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

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
                    post_id: easyReviewData.post_id,
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
                    post_id: easyReviewData.post_id,
                    annotation_id: id
                })
            });
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

            const targetId = link.getAttribute("href").replace("#", "");
            const target = document.getElementById(targetId);

            if (!target) return;

            target.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "center"
            });

        });
});