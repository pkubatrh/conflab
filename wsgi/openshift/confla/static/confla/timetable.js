/*
    @file: timetable.js
    @author: Stanislav Laznicka <slaz@seznam.cz>
    @author: Petr Kubat <petr.kubat.hb@seznam.cz>
*/

var cellSize = 31; // cell height + 1 border
var itemHeight = 28;
var changes = false;

$.expr[':'].Contains = function(a, i, m) {
    // m is PROBABLY an array ofcCaller, calling method('Contains'), and content of the call
    return (a.textContent || a.innerText || "").toUpperCase().indexOf(m[3].toUpperCase()) >= 0;
}

function listFilter(input, list, elem) {
    $(input)
        .change(function() {
            var filter = $(this).val();
            if(filter) {
                $matches = $(list).find(elem + ':Contains(' + filter + ')').parent().parent();
                $('.event', list).not($matches).hide();
                $matches.show();
            }
            else {
                $(list).find('.event').show();
            }
            return false;
        })

        .keyup(function() {
            $(this).change();
        });
}

function countEndtime(tr_array, rownumber) {
    /*
        Function that gets the endtime of a timeslot
        from the given rownumber. If the rownumber is too
        big, it counts the last time that's not in the table.

        WARNING: Time has to be in the first cell on each row
    */
    if(rownumber === tr_array.length) {
        var time_td = $(tr_array[tr_array.length-1]).children('td')[0];
        var td_text = $(time_td).text();
        var firstpart = td_text.slice(0,2);
        var secondpart = td_text.slice(3,5);
        var tdelta = $(tr_array).parent().parent().attr("tdelta");
        secondpart = parseInt(secondpart)+parseInt(tdelta);
        if(secondpart >= 60) {
            firstpart = parseInt(firstpart) + 1;
            secondpart = secondpart - 60;
            if(secondpart === 0) secondpart = "00";
        }
        var endtime_text = firstpart + ':' + secondpart;
    }
    else {
        var endtime = $(tr_array[rownumber]).children('td')[0];
        var endtime_text = $(endtime).text();
    }

    return endtime_text;
}

function eventInit(selector) {
    $(selector).each( function() {
        $(this).draggable({
            revert: function(dropped) {
                $(this).data('dragging', false);
                if (dropped) {
                    // Flag for pending changes to the schedule
                    changes = true;
                    return false;
                }
                else {
                    $(".drag-help").remove();
                    $(this).css("visibility", "visible").show();
                    $(this).parent().removeClass("empty");
                    return true;
                }
            },
            containment: "body",
            cursor: "grabbing",
            opacity: 0.7,
            //stack: ".item",
            appendTo: "body",
            zIndex: 10000,
            cursorAt: { top: 20, left: 20 },
            helper: function () {
                var helper = $(this).find(".event-visible").clone();
                $(helper).height(50);
                $(helper).width($(this).parent().width()/2);
                return helper;
            }
        }).on("dragstart", function () {
            // Hide all open popovers on drag
            $("[aria-describedby]").popover("hide");
            $(this).css("visibility", "hidden").hide();
            $(this).parent().addClass("empty");
        }).on("dragstop", function () {
            $(this).css("visibility", "visible").show();
            $(this).parent().removeClass("empty");
        }).find("div.removesign").click(function() {
            // add closing functionality
            $(this).closest(".item").addClass("empty").resizable("destroy");
            $(this).closest(".wrap").droppable("destroy");
            emptyItemInit($(this).closest(".item"));
            $(this).closest(".event").remove();
        });
        $(this).find(".event-visible").css("cursor", "grab");
        if ($(this).find(".topic").text()) {
            // Setup primary tag in tag select
            $(this).find(".event-visible").each(function () {
                tagId = $(this)[0].className.split(/\s+/)[1].slice(3);
                if (tagId) {
                    select = $(this).parent().find(".sel-tag");
                    select.prepend($(select).find("[value=" + tagId + "]"));
                }
            });
        }
    });
    $(selector).closest("td").off("click");
}

function itemInit(selector) {
    $(selector).each( function() {
        var container = $(this).closest("tbody");
        $(this).resizable({
            grid: cellSize,
            containment: container,
            handles: "s",
            resize: function(event, ui) {
                // Repair inaccuracies in size difference when zoomed in/out
                ui.size.height = Math.round((ui.size.height-itemHeight) / (cellSize)) * (cellSize) + itemHeight;
                // New end time on resize
                var row = $(this).parent().parent().parent().parent().children().index($(this).parent().parent().parent());
                var height = ui.size.height;
                var rowdiff = (height-itemHeight)/cellSize;
                var endspan = $(this).find("span.end")
                var tr_array = $(this).parent().parent().parent().parent().find('tr');
                var endtime_text = countEndtime(tr_array, row+rowdiff+1)
                $(endspan).text("Ends at: " + endtime_text);
            }
        })
    });
    // Setup wrap as the droppable
    $(selector).parent().droppable({
        accept: ".event",
        tolerance: "pointer",
        drop: function( event, ui ) {
            item = $(this).find(".item");
            $(".drag-help").remove();
            // Dropped into another slot
            if (!$(item).is($(ui.draggable).parent())) {
                // Don't append empty events to event list
                if ($(ui.draggable).parent().is("#event-list") &&
                        !$(item).find(".topic:hidden").text()) {
                    $(item).find(".event").remove();
                    $(item).append($(ui.draggable));
                }
                else if ($(ui.draggable).parent().is("#event-list")) {
                    // Dragged from event list
                    $(".event-visible", item).popover("disable");
                    $(ui.draggable).parent().append($(item).find(".event:hidden").show());
                    $(item).find(".drag-help").remove();
                    $(".item-buttons", ui.draggable).show();
                    $(item).append($(ui.draggable));
                    $(".toggler").trigger("click");
                    $(".event-visible", ui.draggable).popover("enable");
                } else {
                    // Dragged from a different item
                    $(item).find(".drag-help").remove();
                    $(ui.draggable).parent().find(".drag-help").remove();
                    $(ui.draggable).parent().append($(item).find(".event").show());
                    $(item).append($(ui.draggable).show());
                }
            }
            // Dropped into itself
            else {
                $(ui.draggable).css("visibility", "visible").show();
                $(ui.draggable).parent().removeClass("empty");
            }
        },
        over: function(event, ui) {
            var item = $(this).find(".item");
            $(".drag-help").remove();
            // Ignore over event from yourself
            // Ensure the code is run after out finishes
            setTimeout(function () {
                if (!$(ui.draggable).parent().is("#event-list")) {
                    // Dragged from an item
                    if (!$(item).is($(ui.draggable).parent())) {
                        // Dragged over a different item
                        $(ui.draggable).parent().removeClass("empty");
                        $(ui.draggable).parent().append($(item).find(".event").clone().addClass("drag-help").show());
                        $(item).find(".event").hide();
                        $(item).append($(ui.draggable).clone().addClass("drag-help").css("visibility", "visible").show());
                        $(ui.draggable).hide();
                    }
                    else if (ui.draggable.data('dragging')) {
                        // Dragged over itself
                        $(ui.draggable).parent().append($(ui.draggable).clone().addClass("drag-help").css("visibility", "visible").show());
                        $(ui.draggable).hide();
                    }
                }
                else {
                    // Dragged from event list
                    $(item).find(".event").hide();
                    $(item).append($(ui.draggable).clone().addClass("drag-help").css("visibility", "visible").show());
                    $(".item-buttons", ".drag-help").show();
                }
            }, 0);
        },
        out: function(event, ui) {
            item = $(this).find(".item");
            if (!$(ui.draggable).parent().is("#event-list")) {
                // Dragged out of a different item
                $(ui.draggable).parent().addClass("empty");
                $(".event:hidden").show();
                $(".drag-help").remove();
            }
            else {
                // Dragged from event list
                $(".sched-wrap .event:hidden").show();
                $(".drag-help").remove();
            }
            if ($(item).is($(ui.draggable).parent())) {
                ui.draggable.data('dragging', true);
            }
        }
    });
}

function emptyItemInit(selector) {
    $(selector).parent().droppable({
        accept: ".event",
        tolerance: "pointer",
        drop: function( event, ui ) {
            var item = $(this).find(".item");
            $(".drag-help").remove();
            // Dont drop into itself
            if (!$(item).is($(ui.draggable).parent())) {
                if (!$(ui.draggable).parent().is("#event-list")) {
                    // Dragged from a different item
                    var slot = $(ui.draggable).parent();
                    slot.addClass("empty");
                    slot.resizable("destroy");
                    slot.parent().droppable("destroy");
                    emptyItemInit(slot);
                }
                else {
                    // Dragged from event list
                    $(".item-buttons", ui.draggable).show();
                    $(this).removeClass("empty");
                    $(this).droppable("destroy");
                    $(".toggler").trigger("click");
                    $(".event-visible", ui.draggable).popover("enable");
                }
                $(item).find(".drag-help").remove();
                $(item).append($(ui.draggable).show());
                $(item).removeClass("empty");
                itemInit(item);
            }
        },
        over: function(event, ui) {
            var item = $(this).find(".item");
            $(".drag-help").remove();
            // Ignore over event from yourself
            if (!$(item).is($(ui.draggable).parent())) {
                // Ensure the code is run after out finishes
                setTimeout(function () {
                    if (!$(ui.draggable).parent().is("#event-list")) {
                        // Dragged from a different item
                        if (!$(item).is($(ui.draggable).parent())) {
                            // Dragged over a different item
                            $(item).append($(ui.draggable).clone().addClass("drag-help").css("visibility", "visible").show());
                            $(ui.draggable).hide();
                        }
                    }
                    else {
                        // Dragged from event list
                        $(item).append($(ui.draggable).clone().addClass("drag-help").css("visibility", "visible").show());
                    }
                    $(".item-buttons", ".drag-help").show();
                }, 0);
            }
        },
        out: function(event, ui) {
            var item = $(this).find(".item");
            if (!$(ui.draggable).parent().is("#event-list")) {
                // Dragged from a different item
                if (!$(item).is($(ui.draggable).parent())) {
                    // Dragged out of a different item
                    $(".drag-help").remove();
                    $(".event:hidden").show();
                }
            }
            else {
                // Dragged from event list
                $(".drag-help").remove();
                $(".sched-wrap .event:hidden").show();
            }
        }
    });
    $(selector).closest("td").off("click").on("click", ".item", appendEvent);
}

function createEvent() {
        var nevent = document.createElement('div');
        nevent.className = "event";
        var visevent = document.createElement('div');
        visevent.className = 'event-visible tag0';
        var buttondiv = document.createElement('div');
       /* buttondiv.className="item-buttons";
        var remove = document.createElement('div');
        remove.className="removesign";
        $(remove).append('<span class="glyphicon glyphicon-remove"></span>');
        $(buttondiv).append(remove);
        var edit = document.createElement('div');
        edit.className="editsign";
        $(edit).append('<span class="glyphicon glyphicon-edit"></span>');
        $(buttondiv).append(edit);
        $(visevent).append(buttondiv);*/
        $(visevent).append('<p class="topic"></p>');
        $(visevent).append('<p class="author"></p>');
        $(nevent).append(visevent);
        // Generate popover title and content
        var poptitle = document.createElement('div');
        poptitle.className = "pop-title";
        $(poptitle).attr("style", "display : none");
        // TODO: Translation in javascript
        // https://docs.djangoproject.com/en/1.8/topics/i18n/translation/#using-the-javascript-translation-catalog
        $(poptitle).append('<span>Add event</span>')
        $(poptitle).append('<span class="pop-close" glyphicon glyphicon-remove></span>');
        $(nevent).append(poptitle);
        var popcontent = document.createElement('div');
        popcontent.className = "pop-content";
        $(popcontent).attr("style", "display : none");
        // Event create form
        nform = document.createElement('form');
        $(nform).attr("method", "post");
        $(nform).attr("action", form_action);
        $(nform).append($($("[name=csrfmiddlewaretoken]")[0]).clone());
        $(nform).append('<input type="hidden" name="event_id" value="0" />');
        $(nform).append(form);
        $(popcontent).append(nform);
        $(nevent).append(popcontent);
        // jQuery magic
        popoverInit(visevent);
        eventInit(nevent);
        return nevent;
}

function appendEvent(e) {
    var wrap = $(this).parent();
    if ($(this).hasClass("empty")) {
        $(this).removeClass("empty");
        var newevent = createEvent();
        $(wrap).droppable("destroy");
        itemInit(this);
        $(this).append(newevent);
        $(this).closest("td").off("click");
    }
}

function timetableToJson(selector) {
    var cols = $(selector + " thead tr th").map(function() {
        return $(this).text()
    });
    var tableObject = $(selector + " tbody tr").map(function(i) {
        var row = {};
        $(this).find('td').each(function(i) {
            if(i > 0) {// omitting the first time-column
                if($(this).text().match(/[a-z]/i) // there is actually some text in the cell
                   && $(this).find(".item .event").length != 0 // there is an event inside the cell
                   && $(this).find(".item .event").attr("event-id")) { // the event has been properly saved
                    var rowName = cols[i];
                    var cell = {};
                    // The numbers 10 and 8 are the lenght of "Starts at: ", "Ends at: "
                    cell["day"] = $(this).closest(".day-wrap").find("h4").text()
                    cell["start"] = $($(this).find("span.start")).text().slice(11,16);
                    cell["end"] = $($(this).find("span.end")).text().slice(9,14);
                    cell["event"] = $(this).find(".event").attr("event-id")
                    row[rowName] = cell;
                }
            }
        });
        return row;
    }).get()
    for(i = 0; i < tableObject.length; i++) {
        if(Object.getOwnPropertyNames(tableObject[i]).length === 0) {
            tableObject.splice(i, 1);
            i--;
        }
    }

    return JSON.stringify(tableObject);
}

function timetableEnable() {
    // enable resize
    $(".item:not(.empty)").resizable("enable");

    // enable event dragging for nonempty events
    $(".event").each( function() {
        if ($(this).find(".topic").text()) {
            $(this).draggable("enable")
        }
    });

    $(".event-visible").css("cursor", "grab");
}

function timetableDisable() {
    // disable resize
    $(".item:not(.empty)").resizable("disable");

    // disable event dragging
    $(".event").draggable("disable")

    // Remove display: block
    $(".ui-resizable-handle").css('display', '');

    $(".event-visible").css("cursor", "auto");
}

function timetableSubmit(selector) {
    // generate JSON and submit to DB
    var toSend = timetableToJson(selector);
    def = $.post(save_link, {
        csrfmiddlewaretoken: document.getElementsByName('csrfmiddlewaretoken')[0].value,
        data: toSend});
    $.when(def).then(function (){
        // Success
        changes = false;
    }, function (response){
        // Failure
        var div = '<div class="alert alert-danger"><i class="fa fa-exclamation-triangle fa-lg"></i> Failed to save schedule.</div>';
        $(".sched-wrap").prepend(div);
    });
}

function selectizePopover(selector) {
    // Selectize speaker init
    $(selector).find(".sel-speaker").each( function () {
        var select = this;
        var itemlist = [];
        // Setup list of selected users
        $(this).find("[selected='selected']").each(function () {
            itemlist.push($(this).text());
        });
        $(this).selectize({
            persist: false,
            maxItems: null,
            valueField: 'username',
            labelField: 'name',
            searchField: ['name', 'username'],
            options: users,
            items: itemlist,
            render: {
                item: function(item, escape) {
                    return '<div>' +
                        (item.name ? '<span class="name">' + escape(item.name) + ' </span>' : '') +
                        (item.username ? '<span class="username">(' + escape(item.username) + ')</span>' : '') +
                    '</div>';
                },
                option: function(item, escape) {
                    var username = item.username;
                    var name = item.name;
                    return '<div>' +
                        '<span class="name">' + escape(name) + '</span>' +
                        '<span class="username">(' + escape(username) + ')</span>' +
                    '</div>';
                }
            }
        });
        $("div.sel-speaker").removeClass("selectize-input");
    });

    // Selectize tags init
    $(selector).find(".sel-tag").each( function () {
        var select = this;
        var itemlist = [];
        // Setup list of selected tags
        $(this).find("[selected='selected']").each(function () {
            itemlist.push($(this).val());
        });
        $(this).selectize({
            plugins: ['drag_drop'],
            persist: false,
            maxItems: null,
            valueField: 'id',
            labelField: 'name',
            searchField: ['name'],
            items: itemlist,
            render: {
                item: function(item, escape) {
                    return '<div>' +
                        '<span class="name">' + escape(item.name) + ' </span>' +
                    '</div>';
                },
                option: function(item, escape) {
                    var caption = item.name;
                    return '<div>' +
                        '<span class="caption">' + escape(caption) + '</span>' +
                            '</div>';
                }
            }
        });
        $("div.sel-tag").removeClass("selectize-input");
    });
}

function popoverInit(selector) {
    $(selector).popover({
        placement: "right",
        container: "body",
        html: "true",
        title: function () {
            return $(this).closest(".event").find(".pop-title").html();
        },
        content: function () {
            var that = this;
            var eventp = $(this).closest(".event");
            var content = $(eventp).find(".pop-content");
            // If the content has not been fetched yet
            if (!content.length) {
                var spinner = '<i style="text-align:center" class="fa fa-5x fa-spinner fa-spin"></i>';
                // Send a post and monitor the promise object
                def = $.post(popover_link, {
                    csrfmiddlewaretoken: document.getElementsByName('csrfmiddlewaretoken')[0].value,
                    data: $(eventp).attr("event-id"),
                });
                $.when(def).then(function (response){
                    // Success
                    var popid = "#" + $(that).attr("aria-describedby");
                    var popcontent = $(response).children();
                    var e = $(that)[0].getBoundingClientRect();
                    var pop = $(popid)[0];
                    var scrollTop = window.pageYOffset
                    var scrollLeft = window.pageXOffset
                    selectizePopover(popcontent);
                    $(popid).find(".fa-spinner").remove();
                    $(popid).find(".popover-content").append(popcontent);
                    // Compute the popover position using bootstrap's popover prototype
                    var position = $.fn.popover.Constructor.prototype.getCalculatedOffset(
                            'right', e, pop.offsetWidth, pop.offsetHeight);
                    // Create document coordinates from relative ones and apply adjustments
                    position.top = position.top + scrollTop;
                    position.left = position.left + scrollLeft + 10;
                    // Save new position
                    $(popid).offset(position);
                    var div = document.createElement("div");
                    div.className = "pop-content";
                    $(div).append($(response).children().clone()).hide();
                    $(".adv-link", popid).click(function(event) {
                        $(that).popover("hide");
                        showModal(eventp);
                    });
                    $(".adv-link", div).click(function(event) {
                        $(that).popover("hide");
                        showModal(eventp);
                    });
                    $(eventp).append(div);

                }, function(response) {
                    // Failure
                    $("[aria-describedby]").popover("hide");
                    alert("Something went wrong!");
                });
                return spinner;
            } else
                // Content has already been fetched from the server
                var popcontent = content.children().clone(true).show();
                selectizePopover(popcontent);
                return popcontent;
        }
    }).on("show.bs.popover", function() {
        // Hide all other popovers when showing a new one
        $("[aria-describedby]").not(this).popover("hide");
    }).on("shown.bs.popover", function() {
        // Set click method for the close icon
        var item = this;
        var popoverSelector = "#" + $(this).attr("aria-describedby");
        $(popoverSelector).find(".pop-close").on("click", function () {
            $(item).popover("hide");
        });
    }).on("hide.bs.popover", function () {
        var original = $(this).parent().parent().parent().find(".pop-content");
        var popoverSelector = "#" + $(this).attr("aria-describedby");
        var content = $(popoverSelector).find(".popover-content");
        var visible = $(this);
        var selSpeaker = $(content).find("select.sel-speaker");
        var selTag = $(content).find("select.sel-tag");

        // Remove existing errors
        $(".alert").remove();

        // If something went wrong when creating the popover
        if(!selTag.length || !selSpeaker.length) return;

        // Copy edited content into original html
        $(original).find("#id_topic").attr("value", ($(content).find("#id_topic").val()));
        $(original).find("#id_description").text($(content).find("#id_description").val());
        $(visible).find(".topic").text(($(content).find("#id_topic").val()));
        $(visible).find(".desc").text($(content).find("#id_description").val());
        // Go through all options in the original selects and mark them selected/not selected

        // Speaker select
        $(original).find("select.sel-speaker").children().each(function () {
            if ($.inArray($(this).text(), selSpeaker[0].selectize.items) !== -1) {
                $(this).attr("selected", "selected");
            }
            else {
                $(this).removeAttr("selected");
            }
        });

        var items = selTag[0].selectize.items;
        // Move the primary tag to the correct place
        tagId = items[0];
        if (tagId) {
            select = $(original).find(".sel-tag");
            select.prepend($(select).find("[value=" + tagId + "]"));
        }
        else tagId = "0";
        // Setup correct css class for the tag
        $(original).parent().find(".event-visible")[0].className = "event-visible tag" + tagId;
        // Tag select
        $(original).find("select.sel-tag").children().each(function () {
            if ($.inArray($(this).val(), selTag[0].selectize.items) !== -1) {
                $(this).attr("selected", "selected");
            }
            else {
                $(this).removeAttr("selected");
            }
        });
        // Save the event form
        var form = original.find("form");
        $(form).ajaxForm();
        $(form).ajaxSubmit({
            success: function(response) {
                var event_id = form.find("[name=event_id]");
                if (event_id.attr("value") == 0) {
                    event_id.attr("value", response);
                    visible.closest(".event").attr("event-id", response);
                    visible.closest(".event").find(".pop-title span:not(.pop-close)").html("Edit event");
                }
            },
            error: function(response) {
                // Create error message and scroll to it
                var error = response.responseText || 'Unknown error.';
                var div = $('<div class="alert alert-danger">' + error + '</div>');
                $(div).prepend('<span><i class="fa fa-exclamation-triangle fa-lg"></i> Error while saving event: </span>');
                $(".sched-wrap").prepend(div);
                // Smooth scroll
                $('html,body').animate({
                    scrollTop: $(div).offset().top
                }, 666);
            }
        });
        // TODO: Check response before enabling
        $(original).parent().draggable("enable");
        $(original).parent().find(".event-visible").css("cursor", "grab");
    });
}

function timetableInit() {
// Go through all .item objects and make them resizable and droppable
itemInit(".item:not(.empty)");
// Make all empty items droppable
emptyItemInit(".item.empty");

// Make all events draggable
eventInit(".event");

timetableDisable();
}

window.addEventListener("beforeunload", function (event) {
    // Warn the user when leaving the page with pending changes
    if (changes) {
        event.preventDefault();
    }
});

$(document).ready(function() {
    // Go through all .item objects and make them the right size
    $(".item").height(function(){
        var len = $(this).attr("deltalen");
        if (len == "default") len = 1;
        return itemHeight+cellSize*(len-1)
    });

    // Setup BootSideMenu
    $('#event-bar').BootSideMenu({
        side: "right",
        autoClose: true // on page load
    });

    // Bootstrap popover init
    popoverInit(".event-visible");
    $("#event-bar .event-visible").popover("disable");
    // Timetable jQuery init
    timetableInit();

    // EventBar init
    $("#event-bar").droppable({
        greedy: true,
        accept: ".event",
        tolerance: "pointer",
        //hoverClass: "ui-state-hover",
        drop: function(event, ui) {
            // Don't append empty events to event list
            if (!$(ui.draggable).parent().is("#event-list")) {
                var item = $(ui.draggable).parent()
                item.addClass("empty");
                item.parent().droppable("destroy");
                item.resizable("destroy");
                emptyItemInit(item);
            }
            $(".event-visible", ui.draggable).popover("disable");
            $(this).find("#event-list").append($(ui.draggable).show());
            $(".item-buttons:visible", this).hide();
            $("#filter_input").change();
            $(".wrap .empty").closest(".wrap").droppable("enable");
            $(".event:hidden").show();
            $(".drag-help").remove();
        },
        over: function(event, ui) {
            $(".wrap .empty").closest(".wrap").droppable("disable");
            // Remove drag helpers from all items and show original events
            $(".drag-help").parent().find(".event").show();
            $(".drag-help").remove();
            // Then hide the dragged event
            $(ui.draggable).hide();
            $(ui.draggable).parent().addClass("empty");
        },
        out: function(event, ui) {
            $(".wrap .empty").closest(".wrap").droppable("enable");
            $(ui.draggable).parent().removeClass("empty");
            $(".toggler").trigger("click");
        }
    });

    // Close all edit popovers if clicked outside of a popover or visible event
    $('html').on('click', function(e) {
        // If the target is not the visible event or one of its children
        if (!$(e.target).closest(".event-visible").length
            // If the target is not a popover
            && !$(e.target.closest(".popover")).length) {
                $('.event-visible').each( function () {
                // If there is an open popover, hide it
                if ($(this).attr("aria-describedby")) {
                    $(this).popover('hide');
                }
            });
        }
    });
    listFilter($("#filter_input"), $("#event-list"), "p");

    // Setup slot lengths for empty slots
    var total = $(".table:first tbody tr").length;
    $(".table").each(function() {
        var that = this;
        // For each room name table header except the first one (time)
        $("th:not(:first-child)", that).each(function() {
            var index = $(this).index() + 1;
            var slot_len = $(this).attr("slot_len")
            $("tr", that).each(function(i){
                row = this;
                // Setup the length of every empty slot to the rooms default for a column
                // given by "index" and a row given by "row"
                $("td:nth-child("+ index +") .empty", row).closest(".item").each(function() {
                    // If there is no more room for a slot of given size
                    // set the item's length to 1
                    if (total-i < slot_len-1) {
                        $(this).height(itemHeight);
                        // TODO: Setup end time for slots of length 1 here
                    }
                    else {
                        $(this).height(itemHeight+cellSize*(slot_len-1));
                        // Setup end time for timetable update
                        endIndex = $(row).index() + parseInt(slot_len) + 1;
                        endTime = $("tbody tr:nth-child(" + endIndex + ") td:first", that).text();
                        $(this).find(".end").text("Ends at: " + endTime);
                    }
                });
            });
        });
    });
    // Setup modal
    setupModal(".modal");
    timetableEnable();
    $(".spinnerwrap").remove();
    $(".sched-wrap").show();
})
