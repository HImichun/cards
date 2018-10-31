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
            _this.game.take(_this);
            e.dataTransfer.setData("text", "help");
        };
        this.el.ondragend = function (e) { return _this.game.clearHolding(); };
        this.el.onclick = function (e) {
            e.preventDefault();
            if (!_this.isOpen && _this.stack.manualOpen && _this.stack.topCard == _this) {
                _this.open();
                _this.stack.render();
                return;
            }
            if (_this.isOpen) {
                e.stopPropagation();
                if (_this.game.holding.length == 0 || !_this.stack.put(_this.game.holding))
                    _this.game.take(_this);
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
            var cards = _this.game.holding;
            _this.put(cards);
        };
        this.el.onclick = function (e) {
            e.preventDefault();
            if (_this.game.holding.length == 0)
                return;
            var cards = _this.game.holding;
            _this.put(cards);
        };
    }
    Stack.prototype.put = function (cards) {
        this.game.clearHolding();
        var canDrop = this.canDrop(cards, this.topCard);
        if (canDrop) {
            this.addMany(cards);
            return true;
        }
        return false;
    };
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
        for (var _i = 0, cards_1 = cards; _i < cards_1.length; _i++) {
            var card = cards_1[_i];
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
    Stack.dropGoal = function (holding, topStack) {
        if (topStack) {
            if (holding.length == 1
                && holding[0].suit == topStack.suit
                && holding[0].number == topStack.number + 1)
                return true;
        }
        else if (holding.length == 1 && holding[0].name == "a")
            return true;
        return false;
    };
    Stack.dropCol = function (holding, topStack) {
        if (topStack) {
            if (holding[0].color != topStack.color
                && holding[0].number == topStack.number - 1
                && topStack.isOpen)
                return true;
        }
        else if (holding[0].name == "k")
            return true;
        return false;
    };
    return Stack;
}());
var Klondike = /** @class */ (function () {
    function Klondike(el) {
        this.el = el;
        this.holding = [];
        this.settingUp = true;
        this.rewinding = false;
        this.history = [];
        this.cards = this.makeCards();
        this.stacks = this.makeStacks();
        this.start();
        this.settingUp = false;
    }
    Klondike.prototype.take = function (card) {
        var canDrag = card.stack.canDrag(card);
        if (!canDrag)
            return;
        var cardsInStack = card.stack.cards;
        var cards = [];
        for (var i = cardsInStack.indexOf(card); i < cardsInStack.length; i++) {
            var card_1 = cardsInStack[i];
            cards.push(card_1);
            card_1.el.classList.add("drag");
        }
        for (var _i = 0, _a = Object.keys(card.game.stacks); _i < _a.length; _i++) {
            var key = _a[_i];
            if (isNaN(Number(key)))
                continue;
            var stack = this.stacks[key];
            var canDrop = stack.canDrop(cards, stack.topCard);
            if (canDrop)
                stack.el.classList.add("can-drop");
        }
        this.holding = cards.length != 0 ? cards : [];
    };
    Klondike.prototype.clearHolding = function () {
        for (var _i = 0, _a = Object.keys(this.stacks); _i < _a.length; _i++) {
            var key = _a[_i];
            if (isNaN(Number(key)))
                continue;
            var stack = this.stacks[key];
            stack.el.classList.remove("can-drop");
        }
        var cards = this.holding;
        for (var _b = 0, cards_2 = cards; _b < cards_2.length; _b++) {
            var card = cards_2[_b];
            card.el.classList.remove("drag");
        }
        this.holding = [];
    };
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
        this.el.querySelector("#rewind").onclick = function () {
            _this.rewind();
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
var k = new Klondike(document.getElementById("game"));
console.log(k);
