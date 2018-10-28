function randInt(min,max){
	return Math.floor(Math.random() * (max - min) + min)
}

class Card
{
	constructor(id, suit, number){
		this.id = id
		this.suit = suit
		this.number = number
		this.open = true

		if(suit == "h" || suit == "d")
			this.color = "red"
		else
			this.color = "black"

		if(this.number == 1)
			this.name = "a"
		else if(this.number < 11)
			this.name = this.number
		else switch (this.number) {
			case 11: this.name = "j"; break;
			case 12: this.name = "q"; break;
			case 13: this.name = "k"; break;
			default: "idk"
		}

		this.el = document.createElement("div")
		this.el.className = "card " + this.color
		this.el.setAttribute("draggable", "true")
		this.el.ondragstart = e => {
			e.stopPropagation()
			const canDrag = this.stack.canDrag(this)
			if(!canDrag) return;

			const cardsInStack = this.stack.cards
			const cardIds = []
			for(let i = cardsInStack.indexOf(this); i < cardsInStack.length; i++){
				const card = cardsInStack[i]
				cardIds.push(card.id)
				card.el.classList.add("drag")
			}
			e.dataTransfer.setData("text", cardIds.join(","));
		}
		this.el.ondragend = e => {
			this.el.classList.remove("drag")
		}
		this.el.onmousedown = e => {
			if(!this.open){
				if(e.which != 1 || !this.stack.manualOpen) return;
				e.preventDefault()
				this.open = true
				this.stack.render()
			}
		}
	}
	pop(){
		if(this.stack){
			this.stack.remove(this)
			this.stack = null
		}
		return this
	}
}

class Stack
{
	constructor(game, el){
		this.game = game
		this.el = el
		this.cards = []
		
		this.manualOpen = el.getAttribute("manual-open") === "true"? true : false

		if(el.getAttribute("open") === "true")
			this.open = true
		else if (el.getAttribute("open") === "false")
			this.open = false

		this.setDragDrop()

		this.el.ondragover = e => {
			e.preventDefault()
		}
		this.el.ondrop = e => {
			e.preventDefault()
			const cardIds = e.dataTransfer.getData("text").split(",")
			const cards = cardIds.map(id => this.game.cards[id])

			const canDrop = this.canDrop(cards, this.topCard)
			
			for(const card of cards)
				card.el.classList.remove("drag")
			if(canDrop)
				this.addMany(cards)
		}
	}

	setDragDrop(){
		const canDragAttr = this.el.getAttribute("can-drag")
		if(canDragAttr === "true")
			this.canDrag = ()=>true
		else if(canDragAttr === "false")
			this.canDrag = ()=>false
		else
			this.canDrag = Stack[canDragAttr]

		const canDropAttr = this.el.getAttribute("can-drop")
		if(canDropAttr === "true")
			this.canDrop = ()=>true
		else if(canDropAttr === "false")
			this.canDrop = ()=>false
		else
			this.canDrop = Stack[canDropAttr]
	}

	get topCard(){
		return this.cards[this.cards.length-1]
	}

	add(card, dontRender){
		this.cards.push(card.pop())
		card.stack = this
		if(this.open != undefined)
			card.open = this.open

		if(!dontRender)
			this.render()
	}
	addMany(cards){
		for(const card of cards){
			this.add(card,true)
		}
		this.render()
	}
	remove(card){
		const index = this.cards.indexOf(card)
		this.cards.splice(index, 1)
	}

	shuffle(){
		for(let i = 0; i < this.cards.length; i++){
			const buffer = this.cards[i]
			const otherI = randInt(i, this.cards.length)

			this.cards[i] = this.cards[otherI]
			this.cards[otherI] = buffer
		}
	}

	render(){
		for(const card of this.cards){
			if(card.open){
				card.el.classList.remove("hidden")
				card.el.innerText = card.name + " : " + card.suit
			}
			else{
				card.el.classList.add("hidden")
				card.el.innerText = ""
			}
			this.el.appendChild(card.el)
		}
	}


	static dragCol(card){
		return card.open
	}

	static dropGoal(holdings, topStack){
		if(topStack){
			if(holdings.length == 1
			&& holdings[0].suit == topStack.suit
			&& holdings[0].number == topStack.number + 1)
				return true
		}
		else if(holdings.length == 1 && holdings[0].name == "a")
			return true
		return false
	}
	static dropCol(holdings, topStack){
		if(topStack){
			if(holdings[0].color != topStack.color
			&& holdings[0].number == topStack.number - 1
			&& topStack.open)
				return true
		}
		else if(holdings[0].name == "k")
			return true
		return false
	}
	static dropDraw(holdings){
		return holdings[0].stack == this.game.stacks.deck
	}
}

class Klondike
{
	constructor(){
		/** @type {[Card]} */
		this.cards = []
		this.makeCards()

		/** @type {[Stack]} */
		this.stacks = {}
		this.makeStacks()

		this.start()
	}

	makeCards(){
		let i = 0
		for(const suit of ["h","d","c","s"])
			for(let number = 1; number <= 13; number++)
				this.cards.push(new Card(i++, suit, number))
	}

	makeStacks(){
		document.querySelectorAll(".stack").forEach((el,index) => {
			const stack = new Stack(this, el)
			this.stacks[index] = stack
			if(el.id)
				this.stacks[el.id] = stack
		})
	}

	start(){
		const deck = this.stacks.deck
		deck.addMany(this.cards)
		deck.shuffle()

		for(let i = 1; i <= 7; i++){
			const stack = this.stacks[i+5]
			stack.addMany(deck.cards.slice(deck.cards.length-i))
			stack.topCard.open = true
		}

		deck.el.onclick = () => {
			const draw = this.stacks.draw
		
			if(deck.cards.length)
				draw.add(deck.topCard)
			else{
				for(let i = draw.cards.length-1; i >= 0; i--)
					deck.add(draw.cards[i], true)
				deck.render()
			}
		}

		this.render()
	}

	render(){
		for(const key of Object.keys(this.stacks))
			if(isNaN(key))
				continue
			else
				this.stacks[key].render()
	}
}

const k = new Klondike()
console.log(k)