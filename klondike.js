var Card = /** @class */ (function () {
    function Card(game, id, suit, number) {
        var _this = this;
        this.game = game;
        this.id = id;
        this.suit = suit;
        this.number = number;
        this.isOpen = true;
        if (suit == "♥" || suit == "♦")
            this.color = "red";
        else
            this.color = "black";
        if (this.number == 1)
            this.name = "a";
        else if (this.number < 11)
            this.name = this.number.toString();
        else
            switch (this.number) {
                case 11:
                    this.name = "j";
                    break;
                case 12:
                    this.name = "q";
                    break;
                case 13:
                    this.name = "k";
                    break;
                default: "idk";
            }
        this.el = document.createElement("div");
        this.el.className = "card " + this.color;
        this.el.setAttribute("draggable", "true");
        this.el.ondragstart = function (e) {
            e.stopPropagation();
            var canDrag = _this.stack.canDrag(_this);
            if (!canDrag)
                return;
            var cardsInStack = _this.stack.cards;
            var cards = [];
            var cardIds = [];
            for (var i = cardsInStack.indexOf(_this); i < cardsInStack.length; i++) {
                var card = cardsInStack[i];
                cards.push(card);
                cardIds.push(card.id);
                card.el.classList.add("drag");
            }
            for (var _i = 0, _a = Object.keys(_this.game.stacks); _i < _a.length; _i++) {
                var key = _a[_i];
                if (isNaN(Number(key)))
                    continue;
                var stack = _this.game.stacks[key];
                var canDrop = stack.canDrop(cards, stack.topCard);
                if (canDrop)
                    stack.el.classList.add("can-drop");
            }
            e.dataTransfer.setData("text", cardIds.join(","));
        };
        this.el.ondragend = function (e) {
            _this.el.classList.remove("drag");
            for (var _i = 0, _a = Object.keys(_this.game.stacks); _i < _a.length; _i++) {
                var key = _a[_i];
                if (isNaN(Number(key)))
                    continue;
                var stack = _this.game.stacks[key];
                stack.el.classList.remove("can-drop");
            }
        };
        this.el.onmousedown = function (e) {
            if (!_this.isOpen && e.which == 1 && _this.stack.manualOpen && _this.stack.topCard == _this) {
                e.preventDefault();
                _this.open();
                _this.stack.render();
            }
        };
    }
    Card.prototype.open = function () {
        this.game.addToHistory({
            verse: [this, this.open],
            reverse: [this, this.close]
        });
        this.isOpen = true;
    };
    Card.prototype.close = function () {
        this.game.addToHistory({
            verse: [this, this.close],
            reverse: [this, this.open]
        });
        this.isOpen = false;
    };
    Card.prototype.pop = function () {
        if (this.stack) {
            this.stack.remove(this);
            this.stack = null;
        }
        return this;
    };
    return Card;
}());
var Stack = /** @class */ (function () {
    function Stack(game, el) {
        var _this = this;
        this.game = game;
        this.el = el;
        this.cards = [];
        this.manualOpen = el.getAttribute("manual-open") === "true" ? true : false;
        if (el.getAttribute("open") === "true")
            this.isOpen = true;
        else if (el.getAttribute("open") === "false")
            this.isOpen = false;
        this.setDragDrop();
        this.el.ondragover = function (e) {
            e.preventDefault();
        };
        this.el.ondrop = function (e) {
            e.preventDefault();
            var cardIds = e.dataTransfer.getData("text").split(",");
            var cards = cardIds.map(function (id) { return _this.game.cards[id]; });
            var canDrop = _this.canDrop(cards, _this.topCard);
            for (var _i = 0, cards_1 = cards; _i < cards_1.length; _i++) {
                var card = cards_1[_i];
                card.el.classList.remove("drag");
            }
            if (canDrop)
                _this.addMany(cards);
        };
    }
    Stack.prototype.setDragDrop = function () {
        var canDragAttr = this.el.getAttribute("can-drag");
        if (canDragAttr === "true")
            this.canDrag = function () { return true; };
        else if (canDragAttr === "false")
            this.canDrag = function () { return false; };
        else
            this.canDrag = Stack[canDragAttr];
        var canDropAttr = this.el.getAttribute("can-drop");
        if (canDropAttr === "true")
            this.canDrop = function () { return true; };
        else if (canDropAttr === "false")
            this.canDrop = function () { return false; };
        else
            this.canDrop = Stack[canDropAttr];
    };
    Object.defineProperty(Stack.prototype, "topCard", {
        get: function () {
            return this.cards[this.cards.length - 1];
        },
        enumerable: true,
        configurable: true
    });
    Stack.prototype.add = function (card, dontRender) {
        if (dontRender === void 0) { dontRender = false; }
        if (!this.game.settingUp)
            this.game.addToHistory({
                verse: [this, this.add, card, dontRender],
                reverse: [card.stack, card.stack.add, card, dontRender]
            });
        this.cards.push(card.pop());
        card.stack = this;
        if (this.isOpen != undefined)
            card.isOpen = this.isOpen;
        if (!dontRender)
            this.render();
    };
    Stack.prototype.addMany = function (cards) {
        for (var _i = 0, cards_2 = cards; _i < cards_2.length; _i++) {
            var card = cards_2[_i];
            this.add(card, true);
        }
        this.render();
    };
    Stack.prototype.remove = function (card) {
        var index = this.cards.indexOf(card);
        this.cards.splice(index, 1);
    };
    Stack.prototype.shuffle = function () {
        for (var i = 0; i < this.cards.length; i++) {
            var buffer = this.cards[i];
            var otherI = Klondike.randInt(i, this.cards.length);
            this.cards[i] = this.cards[otherI];
            this.cards[otherI] = buffer;
        }
    };
    Stack.prototype.render = function () {
        for (var _i = 0, _a = this.cards; _i < _a.length; _i++) {
            var card = _a[_i];
            if (card.isOpen) {
                card.el.classList.remove("hidden");
                card.el.innerText = card.name + " " + card.suit;
            }
            else {
                card.el.classList.add("hidden");
                card.el.innerText = "";
            }
            this.el.appendChild(card.el);
        }
    };
    Stack.dragCol = function (card) {
        return card.isOpen;
    };
    Stack.dropGoal = function (holdings, topStack) {
        if (topStack) {
            if (holdings.length == 1
                && holdings[0].suit == topStack.suit
                && holdings[0].number == topStack.number + 1)
                return true;
        }
        else if (holdings.length == 1 && holdings[0].name == "a")
            return true;
        return false;
    };
    Stack.dropCol = function (holdings, topStack) {
        if (topStack) {
            if (holdings[0].color != topStack.color
                && holdings[0].number == topStack.number - 1
                && topStack.isOpen)
                return true;
        }
        else if (holdings[0].name == "k")
            return true;
        return false;
    };
    return Stack;
}());
var Klondike = /** @class */ (function () {
    function Klondike() {
        this.settingUp = true;
        this.rewinding = false;
        this.history = [];
        this.cards = this.makeCards();
        this.stacks = this.makeStacks();
        this.start();
        this.settingUp = false;
    }
    Klondike.prototype.addToHistory = function (record) {
        if (!this.rewinding && !this.settingUp)
            this.history.push(record);
    };
    Klondike.prototype.rewind = function () {
        if (this.history.length == 0)
            return;
        this.rewinding = true;
        var reverse = this.history.pop().reverse;
        console.log(reverse);
        var self = reverse.shift();
        reverse.shift().apply(self, reverse);
        this.rewinding = false;
        this.render();
    };
    Klondike.prototype.makeCards = function () {
        var cards = [];
        var i = 0;
        for (var _i = 0, _a = ["♥", "♦", "♣", "♠"]; _i < _a.length; _i++) {
            var suit = _a[_i];
            for (var number = 1; number <= 13; number++)
                cards.push(new Card(this, i++, suit, number));
        }
        return cards;
    };
    Klondike.prototype.makeStacks = function () {
        var _this = this;
        var stacks = {};
        document.querySelectorAll(".stack").forEach(function (el, index) {
            var stack = new Stack(_this, el);
            stacks[index] = stack;
            if (el.id)
                stacks[el.id] = stack;
        });
        return stacks;
    };
    Klondike.prototype.start = function () {
        var _this = this;
        var deck = this.stacks.deck;
        deck.addMany(this.cards);
        deck.shuffle();
        for (var i = 1; i <= 7; i++) {
            var stack = this.stacks[i + 5];
            stack.addMany(deck.cards.slice(deck.cards.length - i));
            stack.topCard.isOpen = true;
        }
        deck.el.onclick = function () {
            var draw = _this.stacks.draw;
            if (deck.cards.length)
                draw.add(deck.topCard);
            else {
                for (var i = draw.cards.length - 1; i >= 0; i--)
                    deck.add(draw.cards[i], true);
                deck.render();
            }
        };
        this.render();
    };
    Klondike.prototype.render = function () {
        for (var _i = 0, _a = Object.keys(this.stacks); _i < _a.length; _i++) {
            var key = _a[_i];
            if (Number(key))
                this.stacks[key].render();
            else
                continue;
        }
    };
    Klondike.randInt = function (min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    };
    return Klondike;
}());
var k = new Klondike();
console.log(k);
