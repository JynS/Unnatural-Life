/*jshint esversion: 6 */
$(document).ready(function() {

    $(".c-editor-text").trumbowyg({
        svgPath: '/icons.svg',
        removeformatPasted: true,
        btns: [
            ['formatting'],
            'btnGrp-semantic',
            ['superscript', 'subscript'],
            ['link'],
            'btnGrp-justify',
            'btnGrp-lists',
            ['horizontalRule'],
            ['removeformat'],
            ['fullscreen']
        ]
    });

    // -------------- Edit -------------- \\

    var eName = "#c-editor-name";
    var eOrder = "#c-editor-order";
    var eImage = "#c-editor-image";
    var eChecklist = "#c-editor-checklist";
    var eText = "#c-editor-text";
    var eNameW = "#c-editor-name-wrapper";
    var eOrderW = "#c-editor-order-wrapper";
    var eImageW = "#c-editor-image-wrapper";
    var eTextW = "#c-editor-text-wrapper";
    var aName = "#c-add-name";
    var aOrder = "#c-add-order";
    var aImage = "#c-add-image";
    var aText = "c-additor-text";
    var aNameW = "#c-add-name-wrapper";
    var aOrderW = "#c-add-order-wrapper";
    var aImageW = "#c-add-image-wrapper";
    var aTextW = "#c-additor-text-wrapper";

    // open and set up edit panel
    $(".c-edit-btn").click(function() {

        // get edit target and build key
        var editTarget = $(this).attr('c-edit-target');
        var key = getKey(editTarget.split('-'));

        // fill the editor
        // initEditor(editTarget, editType, editUrl);
        initEditor(key, editTarget);

        // open edit panel
        openEditPanel();
        show("#c-edit-form");
    });

    // close and clear edit panel
    $(".c-edit-close").click(function() {

        closeEditPanel();
        clearEditor();
    });


    // send data from editor to server
    $("#c-edit-form").submit(function(e) {
        e.preventDefault();

        var target = $("#c-edit-content").attr("c-edit-target").slice(1);
        var key = getKey(target.split('-'));
        var send;

        if (!!key.property.match(/image|icon/)) {
            // images need to be dealt with differently

            var type;
            send = new FormData();
            send.append('image', $(eImage)[0].files[0]);
            send.append('target', target);

            sendData('/update/image/' + key.collection, send, 'PUT', window.location.href, false, false);
            $(".c-loading").removeClass('c-hide');
        }
        else {

            send = {};
            // get and send data
            var data = getData(key);

            if (!$.isEmptyObject(data)) {

                send.data = JSON.stringify(data);
                send.target = target;
                sendData("/update/", send, "PUT", window.location.href);
                $(".c-loading").removeClass('c-hide');
            }

        }

    });

    function getData(key) {

        var kc = key.collection;
        var kp = key.property;
        var kid = key.id;

        var data = {};

        if (kp === "warnings") {
            // checklist data

            data.warningKeys = [];
            data.warningText = [];
            $("#c-editor-checklist :input:checked").each((i, v) => {
                var key = parseInt($(v).val());
                var text = $(`#c-editor-checklist input[key='${key}']`).val();
                data.warningKeys.push(key);
                data.warningText.push(text);
            });
        }
        else if (kp === "text") {
            // get the changed character or organization fields

            if ($(eName).val() !== $("#" + kc + "-name-" + kid).text()) data.name = $(eName).val();
            if ($(eOrder).val() !== $("#" + kc + "-order-" + kid).val() && $(eOrder).val() !== "1") data.order = $(eOrder).val();
            if ($(eText).html() !== $("#" + kc + "-description-" + kid).html()) data.description = $(eText).html();
        }
        else if (!!kp.match(/arc|title/)) {
            if ($(eName).val() !== $("#" + kc + "-" + kp + "-" + kid).val()) data[kp] = $(eName).val();
        }
        else {
            if ($(eText).html() !== $("#" + kc + "-" + kp + "-" + kid).html()) data[kp] = $(eText).html();
        }

        return data;
    }

    function sendData(url, data, method, returnUrl, contentType, processData) {
        $.ajax({
            contentType: contentType,
            data: data,
            processData: processData,
            method: method,
            url: url
        }).done(function() {
            window.location.href = returnUrl;
        }).fail(function(e) {
            console.error(e);
            var response = e.responseText;
            document.body.outerHTML = response;
        });
    }


    // open/close the edit panel
    function openEditPanel() {

        show("#c-overlay");
        $("#c-wrapper").toggleClass("c-lock");

    }
    function closeEditPanel() {

        hide("#c-edit-form");
        hide("#c-add-form");
        hide("#c-overlay");
        $("#c-wrapper").toggleClass("c-lock");

    }

    // set up the editor
    function initEditor(key, target) {

        var kc = key.collection;
        var kp = key.property;
        var kid = key.id;

        $("#c-edit-content").attr("c-edit-target", target);

        if (kc === "#character") {

            if (kp === "icon") initImage(eImageW);
            else {
                initName(eNameW, eName, "#character-name-" + kid);
                initOrder(eOrderW, eOrder, "#character-order-" + kid);
                initText(eTextW, eText, "#character-description-" + kid);
            }
        }
        else if (kc === "#organization") {

            initName(eNameW, eName, "#organization-name-" + kid);
            initOrder(eOrderW, eOrder, "#organization-order-" + kid);
            initText(eTextW, eText, "#organization-description-" + kid);
        }
        else if (kc === "#comic") {

            if (!!kp.match(/arc|title/)) initName(eNameW, eName, target);
            else if (!!kp.match(/summary|transcript|comments/)) initText(eTextW, eText, target);
            else if (kp === "warnings") initChecklist();
            else initImage(eImageW);
        }
        else initText(eTextW, eText, target);
    }

    function initName(elemW, elem, target) {
        show(elemW);
        if (elem) $(elem).val($(target).text());
        $(elemW).attr("c-edit-selected", true);
    }

    function initOrder(elemW, elem, target) {
        show(elemW);
        if (elem) $(elem).val($(target).val());
        $(elemW).attr("c-edit-selected", true);
    }

    function initText(elemW, elem, target) {
        show(elemW);
        if (elem) $(elem).html($(target).html());
        $(elemW).attr("c-edit-selected", true);
    }

    function initChecklist() {
        show(eChecklist);
        $(eChecklist).attr("c-edit-selected", true);
    }

    function initImage(elemW) {
        show(elemW);
        $(elemW).attr("c-edit-selected", true);
    }

    function clearEditor() {

        $("[c-edit-selected='true']").each((i, e) => {
            hide(e);
            $(e).val("");
            $(e).attr("c-edit-selected", "");
        });
    }

    function getKey(targetArr) {
        return {
            collection: targetArr[0],
            property: targetArr[1],
            id: targetArr[2]
        };
    }

    // -------------- Add -------------- \\

    $(".c-add-btn").click(function() {

        // get type
        var addType = $(this).attr('c-add-type');
        $("#c-edit-content").attr("c-edit-type", addType);

        initAdditor(addType);

        // open editor
        show("#c-add-form");
        openEditPanel();
    });

    function initAdditor(type) {
        initName(aNameW);
        initOrder(aOrderW);
        initText(aTextW);
        if (type === "character") {
            initImage(aImageW);
            $(aImage).attr('required', true);
        }
        else $(aImage).attr('required', false);
    }

    $("#c-add-form").submit(function(e) {
        e.preventDefault();

        var type = $("#c-edit-content").attr('c-edit-type');
        var send;
        var name = $("#c-add-name").val();
        var order = $("#c-add-order").val();
        var description = $("#c-additor-text").html();
        var data = {};
        data.name = name;
        if (order !== "") data.order = order;
        data.description = description;

        if (type === "organization") {

            send = {};
            send.data = JSON.stringify(data);

            sendData('/new/organization/', send, "POST", '/characters', "application/x-www-form-urlencoded", true);
            $(".c-loading").removeClass('c-hide');
        }
        else {

            send = new FormData();

            send.append('data', JSON.stringify(data));
            if (order !== "") send.append('order', order);
            send.append('image', $("#c-add-image")[0].files[0]);

            sendData('/new/character/', send, 'POST', '/characters', false, false);
            $(".c-loading").removeClass('c-hide');
        }

    });

    // -------------- Delete -------------- \\
    $(".c-delete-btn").click(function() {

        var deleteTarget = $(this).attr('c-delete-target');
        // open the are you sure panel
        // display the info
        // set the
        var key = getKey(deleteTarget.split('-'));
        initDeleter(key, deleteTarget);

        show("#c-delete-form");
        openEditPanel();
    });

    function initDeleter(key, target) {

        var kc = key.collection;
        var kid = key.id;
        $("#c-delete-form").attr('c-delete-target', target);


        var value;
        if (kc === "#comic") value = "this page";
        else value = $(kc + "-name-" + kid).text();

        $("#to-delete").text(value);
    }

    $("#no-delete").click(function() {
        hide("#c-delete-form");
        closeEditPanel();
    });

    $("#yes-delete").click(function() {

        var target = $("#c-delete-form").attr('c-delete-target').slice(1);

        var data = {target: target};

        sendData("/delete", data, "DELETE", window.location.href);
        $(".c-loading").removeClass('c-hide');
    });

    // -------------- Edit Page -------------- \\
    $("#c-edit-page").submit(function(e) {
        e.preventDefault();

        var send;
        var data = {};

        // get the selected warnings
        data.warningKeys = [];
        data.warningText = [];
        $("#warnings :input:checked").each((i, v) => {
            var key = parseInt($(v).val());
            var text = $(`#warnings input[key='${key}']`).val();
            warnings[key] = text;
            data.warningKeys.push(key);
            data.warningText.push(text);
        });

        data.arc = $("#arc").val();
        data.title = $("#title").val();
        data.summary = $("#summary").html();
        data.transcript = $("#transcript").html();
        data.artistComments = $("#comments").html();

        // check if a file was uploaded
        if ($("#image")[0].files[0]) {
            // an image is being uploaded
            send = new FormData();
            send.append('data', JSON.stringify(data));
            send.append('image', $("#image")[0].files[0]);
            send.append('target', comic._id);
            send.append('ret', "/comic?page=" + retPage);

            sendData('/update/comic', send, 'PUT', "/comic?page=" + retPage, false, false);
        }
        else {
            // image isn't being uploaded
            send = {};
            send.data = JSON.stringify(data);
            send.target = comic._id;
            send.ret = "/comic?page=" + retPage;

            sendData('/update/comic', send, "PUT", "/comic?page=" + retPage, "application/x-www-form-urlencoded", true);
        }
        $(".c-loading").removeClass('c-hide');

    });

    // -------------- New Page -------------- \\

    $("#c-new-page").submit(function(e) {
        e.preventDefault();

        var send = new FormData();
        var data = {};

        // get the selected warnings
        data.warningKeys = [];
        data.warningText = [];
        $("#warnings :input:checked").each((i, v) => {
            var key = parseInt($(v).val());
            var text = $(`#warnings input[key='${key}']`).val();
            warnings[key] = text;
            data.warningKeys.push(key);
            data.warningText.push(text);
        });

        data.arc = $("#arc").val();
        data.title = $("#title").val();
        data.summary = $("#summary").html();
        data.transcript = $("#transcript").html();
        data.artistComments = $("#comments").html();
        send.append('data', JSON.stringify(data));
        send.append('image', $("#image")[0].files[0]);

        sendData('/new/comic', send, 'POST', '/comic/latest', false, false);
        $(".c-loading").removeClass('c-hide');
    });

});
