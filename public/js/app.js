/*jshint esversion: 6 */

// TODO: play with navigator.cookieEnabled for user warnings

// helper functions
function show(elem) {
    $(elem).removeClass('c-hide');
}
function hide(elem) {
    $(elem).addClass('c-hide');
}
// toggle a specific class on a set of elements
function toggleMany(elements, classToToggle) {
    elements.forEach(v => {
        $(v).toggleClass(classToToggle);
    });
}

// main code
$(document).ready(function() {


    // -------------- Archive -------------- \\

    // go to the page
    $("#archive").bind('change', function() {
        $( "#archive option:selected" ).each(function() {
            var pg = $(this).val();
            changePage($(this).val());
        });
    });

    function changePage(value){
        if (value !== "_" ) {
            var location = `/comic?page=${value}`;
            window.location.href=location;
        }
	}

    // -------------- Comic -------------- \\

    // toggle elements
    $(".c-toggle").click(function() {
        // highlight or unhighlight clicked element
        $(this).toggleClass("c-active");
        // show or hide target element
        var target = "#" + $(this).attr("c-vis-target");
        $(target).toggleClass('c-hide');
    });

    // User chooses to skip warnings
    $("#skipWarnings").click(function() {
        skipWarnings();

        // hide the warnings and explanation and show the comic
        toggleMany( [ "#c-warning", "#c-explanation", "#c-img-panel", ".c-resetWarning" ], "c-hide" );

    });

    // reset warnings
    $("#resetWarning").click(function() {
        resetWarning();

        // show the content warnings
        // hide the image panel and resetWarnings button
        // show the reset warnings button
        toggleMany( [ "#c-warning", "#c-img-panel", ".c-resetWarning" ], "c-hide" );

        // unhighlight continue button
        $("#showContent").toggleClass("c-active");

        // uncheck user's warnings
        $("#c-warning-list input:checked").each((i, v) => {
            $(v).attr("checked", false);
        });
    });

    // send warnings
    $("#sendWarnings").click(function() {
        var userWarnings =
        // get warnings the user chose
        getUserWarnings();

        document.cookie =
        // save user's warnings in a cookie
        buildWarningsCookie(userWarnings);

        // check if the user's warnings appear on this page
        if (checkWarnings(userWarnings, pagewarnings)) {
            // they appear

            // close the explanation box
            toggleMany(["#c-explanation", "#customizeWarnings" ], "c-hide");
        }
        else {
            // FIXME: places user smack in the middle of the comic.
            // close the explanation box and show the comic
            toggleMany( [ "#c-warning", "#c-explanation", "#c-img-panel", ".c-resetWarning" ], "c-hide" );
        }
        toggleMany(["#explain", "#customizeWarnings-btn"], "c-active");

    });

    //
    function buildWarningsCookie(warnings) {
        var cookie = "userwarnings=";
        warnings.forEach(v => {
            // build cookie
            cookie += v + "_";
        });
        cookie += "; expires=Thu, 01 Jan 2060 00:00:01 GMT;";
        return cookie;
    }

    function getUserWarnings() {
        var warnings = [];
        $("#c-warning-list input:checked").each((i, v) => {
            warnings.push(parseInt($(v).val()));
        });
        return warnings;
    }

    function checkWarnings(userWarnings, pageWarnings) {

        for (var w of userWarnings) {
            if (pageWarnings.includes(w)) return true;
        }

        return false;
    }

    // bakes the 'userwarnings' cookie
    function skipWarnings() {
        document.cookie = "userwarnings=_; expires=Thu, 01 Jan 2060 00:00:01 GMT;";
    }

    // destroy 'userwarnings' cookie
    function resetWarning() {
        document.cookie = 'userwarnings=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    }

    // -------------- Login -------------- \\

    // login
    $("#c-login").submit(function(e) {
        e.preventDefault();

        // get username and password
        var data = $("#c-login").serializeArray();
        var user = data[0];
        var pw = data[1];
        data = {
            "username" : user.value,
            "password" : pw.value
        };

        // login
        login(data).done(function(res) {
            // bakeToken(res.token);
            window.location.href = "/comic/latest";
        }).fail(function(e) {
            // console.error(e);
            hide(".c-loading");
            show("#c-overlay");
            show(".c-error-wrapper");
        });

        show(".c-loading");
    });

    // $("#logout").click(function() {
    //     destroyToken();
    // });

    $(".c-error-close").click(function() {
        hide("#c-overlay");
        hide(".c-error-wrapper");
    });

    function login(data) {
        // make POST request
        return $.post(
            "/admin",
            data
        );
    }
    //
    // // bakes the 'token' cookie
    // function bakeToken(token) {
    //     document.cookie = "ct=" + token + "; expires=Thu, 01 Jan 2060 00:00:01 GMT;";
    // }
    // function destroyToken() {
    //     document.cookie = "ct=; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    // }

});
