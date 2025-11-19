/**
 * Walkthrough Module
 * Interactive walkthrough for first-time users
 */

import { getElement } from "./utils.js";

/**
 * Walkthrough Manager Class
 * Manages step-by-step walkthrough modal
 */
export class WalkthroughManager {
    constructor(modalId = "walkthroughModal") {
        this.modal = getElement(modalId);
        this.currentStep = 1;
        this.totalSteps = 3;
        this.steps = [];
        this.buttons = {};
    }

    /**
     * Initialize walkthrough
     */
    init() {
        if (!this.modal) {
            console.warn("Walkthrough modal not found");
            return;
        }

        // Cache elements
        this.steps = Array.from(
            this.modal.querySelectorAll(".walkthrough-step")
        );
        this.buttons = {
            next: getElement("walkNextBtn"),
            prev: getElement("walkPrevBtn"),
            done: getElement("walkDoneBtn"),
            goToSettings: getElement("goToSettingsBtn"),
        };

        // Setup event listeners
        this.setupListeners();
    }

    /**
     * Setup event listeners
     */
    setupListeners() {
        // Next button
        if (this.buttons.next) {
            this.buttons.next.addEventListener("click", () => {
                this.nextStep();
            });
        }

        // Previous button
        if (this.buttons.prev) {
            this.buttons.prev.addEventListener("click", () => {
                this.previousStep();
            });
        }

        // Done button
        if (this.buttons.done) {
            this.buttons.done.addEventListener("click", () => {
                this.complete();
            });
        }

        // Go to Settings button (in step 2)
        if (this.buttons.goToSettings) {
            this.buttons.goToSettings.addEventListener("click", () => {
                window.location.href = "pages/settings.html";
            });
        }

        // Modal overlay and close button
        const overlay = this.modal.querySelector(".modal-overlay");
        const closeBtn = this.modal.querySelector(".modal-close");

        if (overlay) {
            overlay.addEventListener("click", () => {
                this.close();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                this.close();
            });
        }

        // Keyboard navigation
        document.addEventListener("keydown", (e) => {
            if (!this.modal.classList.contains("active")) return;

            if (e.key === "ArrowRight" || e.key === "Enter") {
                if (this.currentStep < this.totalSteps) {
                    this.nextStep();
                } else {
                    this.complete();
                }
            } else if (e.key === "ArrowLeft") {
                this.previousStep();
            } else if (e.key === "Escape") {
                this.close();
            }
        });
    }

    /**
     * Show walkthrough
     */
    show() {
        if (!this.modal) return;

        this.currentStep = 1;
        this.modal.classList.add("active");
        this.updateStep();
    }

    /**
     * Close walkthrough
     */
    close() {
        if (!this.modal) return;

        this.modal.classList.remove("active");

        // Mark as seen
        localStorage.setItem("hasSeenWalkthrough", "true");
    }

    /**
     * Go to next step
     */
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateStep();
        }
    }

    /**
     * Go to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
        }
    }

    /**
     * Complete walkthrough
     */
    complete() {
        this.close();

        // Dismiss the callout if it's visible
        const callout = getElement("firstTimeCallout");
        if (callout) {
            callout.style.display = "none";
        }
    }

    /**
     * Update step display
     */
    updateStep() {
        // Update step visibility
        this.steps.forEach((step, index) => {
            const stepNumber = index + 1;
            step.style.display =
                stepNumber === this.currentStep ? "block" : "none";
        });

        // Update button visibility
        if (this.buttons.prev) {
            this.buttons.prev.style.display =
                this.currentStep > 1 ? "inline-flex" : "none";
        }

        if (this.buttons.next) {
            this.buttons.next.style.display =
                this.currentStep < this.totalSteps ? "inline-flex" : "none";
        }

        if (this.buttons.done) {
            this.buttons.done.style.display =
                this.currentStep === this.totalSteps ? "inline-flex" : "none";
        }
    }

    /**
     * Check if user has seen walkthrough
     * @returns {boolean} True if seen
     */
    static hasSeen() {
        return localStorage.getItem("hasSeenWalkthrough") === "true";
    }

    /**
     * Reset walkthrough state
     */
    static reset() {
        localStorage.removeItem("hasSeenWalkthrough");
    }
}

/**
 * Create walkthrough manager
 * @param {string} modalId - Modal element ID
 * @returns {WalkthroughManager} Manager instance
 */
export function createWalkthrough(modalId) {
    const manager = new WalkthroughManager(modalId);
    manager.init();
    return manager;
}

export default WalkthroughManager;
