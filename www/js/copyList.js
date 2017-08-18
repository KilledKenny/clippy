var copyList = (function(win){
    var listElement;
    this.lastItem;
    // constructor
    var copyList = function (identifyer) {
        console.log(identifyer);
        listElement = document.querySelector(identifyer);
        listElement.addEventListener('click', test);
        listElement.addEventListener('touchStart', test);

        var storage = localStorage.getItem('copyList');
        if (storage) {
            var list = JSON.parse(storage);
            list.forEach(function(item){
                addListItem(item);
            });
            this.lastItem = list[list.length-1];
        }
    };

    function addListItem(text) {
        var newLi = document.createElement('li');
        newLi.setAttribute('data-attribute','listItem');
        newLi.textContent = text;

        if(listElement.firstElementChild) {
            listElement.insertBefore(newLi, listElement.firstElementChild);
        } else {
            listElement.appendChild(newLi);
        }
    }

    var test = function(event) {
        //console.log();
        if (event.target.getAttribute('data-attribute') === 'listItem') {
            var notification = document.querySelector('#notification');
            var copyTextarea = document.querySelector('.js-copytextarea');
            //var copyTextarea = document.createElement('text-area');
            copyTextarea.value = event.target.textContent;
            //copyTextarea.disabled = false;
            copyTextarea.select();
            console.log(copyTextarea.value);
            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
                if (successful) {
                    notification.setAttribute('data-balloon-visible','');
                    notification.setAttribute('data-balloon', 'Copied!');
                    window.setTimeout(function(){
                        notification.removeAttribute('data-balloon-visible');
                    }.bind(null, notification), 1000);
                }
            } catch (err) {
                console.log('Oops, unable to copy');
            }
            //copyTextarea.disabled =true;
        }
    };

    var addItem = function(text) {
        console.log(this);
        console.log(text);
        var storage = localStorage.getItem('copyList');
        var list = [];
        if (storage) {
            list = JSON.parse(storage);
            list.push(text);
        } else {
            list.push(text);
        }
        localStorage.setItem('copyList', JSON.stringify(list));
        console.log(listElement);

        addListItem(text);
        this.lastItem = text;
    }

    // prototype
    copyList.prototype = {
        constructor: copyList,
        test: test,
        addItem: addItem
    };
    return copyList;
})(window);