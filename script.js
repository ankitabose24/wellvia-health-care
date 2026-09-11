/* =====================================
   WELLVIA JAVASCRIPT
===================================== */


/* =====================================
   INTRO VIDEO
===================================== */

const intro = document.getElementById("intro");

const introVideo =
    document.getElementById("introVideo");

const introBar =
    document.getElementById("introBar");

const skipIntro =
    document.getElementById("skipIntro");


document.body.classList.add("lock");


function enterWebsite() {

    intro.classList.add("hide");

    document.body.classList.remove("lock");

    setTimeout(() => {

        intro.remove();

    }, 1000);

}


skipIntro.addEventListener(
    "click",
    enterWebsite
);


introVideo.addEventListener(
    "ended",
    enterWebsite
);


/* Video progress */

introVideo.addEventListener(
    "timeupdate",
    () => {

        if (!introVideo.duration) return;

        const progress =
            (introVideo.currentTime /
                introVideo.duration) * 100;

        introBar.style.width =
            `${progress}%`;

    }
);


/* Autoplay safety */

setTimeout(() => {

    if (!intro.classList.contains("hide")) {

        enterWebsite();

    }

}, 8500);



/* =====================================
   MOBILE NAVIGATION
===================================== */

const menuButton =
    document.getElementById("menuBtn");

const nav =
    document.getElementById("nav");


menuButton.addEventListener(
    "click",
    () => {

        const isOpen =
            nav.classList.toggle("mobile-open");


        if (isOpen) {

            nav.style.display = "flex";

            nav.style.position =
                "absolute";

            nav.style.top = "68px";

            nav.style.left = "0";

            nav.style.right = "0";

            nav.style.padding =
                "25px 6vw";

            nav.style.flexDirection =
                "column";

            nav.style.background =
                "rgba(244,245,239,0.96)";

            nav.style.backdropFilter =
                "blur(18px)";

        } else {

            nav.removeAttribute("style");

        }

    }
);


/* Close menu after selecting */

nav.querySelectorAll("a").forEach(
    link => {

        link.addEventListener(
            "click",
            () => {

                if (
                    window.innerWidth <= 900
                ) {

                    nav.removeAttribute(
                        "style"
                    );

                    nav.classList.remove(
                        "mobile-open"
                    );

                }

            }
        );

    }
);



/* =====================================
   3D HERO PHYSICS
===================================== */

const hero =
    document.querySelector(".hero");


const floatingObjects =
    [
        ...document.querySelectorAll(
            ".floating-object"
        ),
        ...document.querySelectorAll(
            ".floating-pill"
        )
    ];


let mouseX = 0;

let mouseY = 0;

let currentX = 0;

let currentY = 0;


hero.addEventListener(
    "pointermove",
    event => {

        const rect =
            hero.getBoundingClientRect();


        mouseX =
            (
                (event.clientX -
                    rect.left) /
                rect.width
                - 0.5
            ) * 2;


        mouseY =
            (
                (event.clientY -
                    rect.top) /
                rect.height
                - 0.5
            ) * 2;

    }
);


function animatePhysics() {

    currentX +=
        (mouseX - currentX) * 0.055;


    currentY +=
        (mouseY - currentY) * 0.055;


    floatingObjects.forEach(
        (element, index) => {

            const depth =
                Number(
                    element.dataset.depth ||
                    (index + 1) * 0.32
                );


            const floatingY =
                Math.sin(
                    Date.now() / 1100 +
                    index
                ) * 5;


            const rotationY =
                currentX *
                depth *
                4;


            const rotationX =
                -currentY *
                depth *
                4;


            let baseTransform = "";


            if (
                element.classList.contains(
                    "capsule-object"
                )
            ) {

                baseTransform =
                    "rotateY(-18deg) rotateZ(6deg)";

            }


            if (
                element.classList.contains(
                    "stethoscope-object"
                )
            ) {

                baseTransform =
                    "rotateY(16deg) rotateZ(-7deg)";

            }


            element.style.transform =

                `${baseTransform}
                translate3d(
                    ${currentX * 18 * depth}px,
                    ${currentY * 14 * depth + floatingY}px,
                    0
                )
                rotateX(${rotationX}deg)
                rotateY(${rotationY}deg)`;

        }
    );


    requestAnimationFrame(
        animatePhysics
    );

}


animatePhysics();



/* =====================================
   3D CARD TILT
===================================== */

const cards =
    document.querySelectorAll(
        ".service-card, .doctor-card, .package-card"
    );


cards.forEach(card => {


    card.addEventListener(
        "pointermove",
        event => {

            if (window.innerWidth < 800)
                return;


            const rect =
                card.getBoundingClientRect();


            const x =
                (event.clientX -
                    rect.left) /
                rect.width -
                0.5;


            const y =
                (event.clientY -
                    rect.top) /
                rect.height -
                0.5;


            const rotateX =
                -y * 5;


            const rotateY =
                x * 6;


            card.style.transform =

                `perspective(900px)
                 rotateX(${rotateX}deg)
                 rotateY(${rotateY}deg)
                 translateY(-5px)`;

        }
    );


    card.addEventListener(
        "pointerleave",
        () => {

            if (
                card.classList.contains(
                    "popular"
                )
            ) {

                card.style.transform =
                    "translateY(-12px)";

            } else {

                card.style.transform =
                    "";

            }

        }
    );

});



/* =====================================
   SCROLL REVEAL
===================================== */

const revealElements =
    document.querySelectorAll(
        `
        .section > *,
        .service-card,
        .doctor-card,
        .package-card,
        .steps > div,
        .contact-details > div
        `
    );


revealElements.forEach(
    element => {

        element.classList.add(
            "reveal"
        );

    }
);


const observer =
    new IntersectionObserver(
        entries => {

            entries.forEach(
                entry => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "visible"
                        );


                        observer.unobserve(
                            entry.target
                        );

                    }

                }
            );

        },
        {
            threshold: 0.08
        }
    );


revealElements.forEach(
    element => {

        observer.observe(element);

    }
);



/* =====================================
   APPOINTMENT FORM
===================================== */

const form =
    document.getElementById(
        "appointmentForm"
    );


const message =
    document.getElementById(
        "formMessage"
    );


const dateInput =
    document.getElementById(
        "date"
    );


/* Prevent past dates */

dateInput.min =
    new Date()
        .toISOString()
        .split("T")[0];


form.addEventListener(
    "submit",
    event => {

        event.preventDefault();


        const name =
            document
                .getElementById("name")
                .value
                .trim();


        const service =
            document
                .getElementById("service")
                .value;


        message.textContent =

            `Thank you, ${name}.
             Your ${service} request has been received.
             We’ll contact you to confirm the appointment.`;


        form.reset();


        /* Restore minimum date */

        dateInput.min =
            new Date()
                .toISOString()
                .split("T")[0];

    }
);



/* =====================================
   HEADER SHADOW ON SCROLL
===================================== */

const header =
    document.querySelector(
        ".site-header"
    );


window.addEventListener(
    "scroll",
    () => {

        if (window.scrollY > 20) {

            header.style.boxShadow =
                "0 10px 30px rgba(30,45,40,0.06)";

        } else {

            header.style.boxShadow =
                "none";

        }

    }
);

/* =====================================
   CAPSULE IMAGE DEPTH + LOGO MICRO-MOTION
===================================== */

const capsuleCard = document.querySelector(".capsule-object");

if (capsuleCard) {
    capsuleCard.addEventListener("pointermove", (event) => {
        if (window.innerWidth < 800) return;
        const rect = capsuleCard.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        capsuleCard.style.setProperty("--capsule-x", `${x * 10}px`);
        capsuleCard.style.setProperty("--capsule-y", `${y * 10}px`);
    });

    capsuleCard.addEventListener("pointerleave", () => {
        capsuleCard.style.setProperty("--capsule-x", "0px");
        capsuleCard.style.setProperty("--capsule-y", "0px");
    });
}
