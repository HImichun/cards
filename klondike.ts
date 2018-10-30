class Card
{
	isOpen : boolean
	color  : string
	name   : string
	el     : HTMLElement
	stack  : Stack

	constructor(
		public game   : Klondike,
		public id     : any,
		public suit   : string,
		public number : number
	){
		this.isOpen = true

		if(suit == "♥" || suit == "♦")
			this.color = "red"
		else
			this.color = "black"

		if(this.number == 1)
			this.name = "a"
		else if(this.number < 11)
			this.name = this.number.toString()
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
			const cards = []
			const cardIds = []
			for(let i = cardsInStack.indexOf(this); i < cardsInStack.length; i++){
				const card = cardsInStack[i]
				cards.push(card)
				cardIds.push(card.id)
				card.el.classList.add("drag")
			}

			for(const key of Object.keys(this.game.stacks)){
				if(isNaN(Number(key))) continue;
				const stack = this.game.stacks[key]
				const canDrop = stack.canDrop(cards, stack.topCard)
				if(canDrop)
					stack.el.classList.add("can-drop")
			}

			e.dataTransfer.setData("text", cardIds.join(","));
		}
		this.el.ondragend = e => {
			this.el.classList.remove("drag")

			for(const key of Object.keys(this.game.stacks)){
				if(isNaN(Number(key))) continue;
				const stack = this.game.stacks[key]
				stack.el.classList.remove("can-drop")
			}
		}
		this.el.onmousedown = e => {
			if(!this.isOpen && e.which == 1 && this.stack.manualOpen && this.stack.topCard == this){
				e.preventDefault()
				this.open()
				this.stack.render()
			}
		}
	}

	open(){
		this.game.addToHistory({
			verse: [this, this.open],
			reverse: [this, this.close]
		})
		this.isOpen = true
	}

	close(){
		this.game.addToHistory({
			verse: [this, this.close],
			reverse: [this, this.open]
		})
		this.isOpen = false
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
	cards	   : Card[]
	manualOpen : boolean 
	isOpen     : boolean
	canDrop    : Function
	canDrag    : Function

	constructor(
		public game : Klondike,
		public el   : HTMLElement
	){
		this.cards = []
		
		this.manualOpen = el.getAttribute("manual-open") === "true"? true : false

		if(el.getAttribute("open") === "true")
			this.isOpen = true
		else if (el.getAttribute("open") === "false")
			this.isOpen = false

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

	add(card, dontRender=false){
		if(!this.game.settingUp)
			this.game.addToHistory({
				verse: [this, this.add, card, dontRender],
				reverse: [card.stack, card.stack.add, card, dontRender]
			})

		this.cards.push(card.pop())
		card.stack = this
		if(this.isOpen != undefined)
			card.isOpen = this.isOpen

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
			const otherI = Klondike.randInt(i, this.cards.length)

			this.cards[i] = this.cards[otherI]
			this.cards[otherI] = buffer
		}
	}

	render(){
		for(const card of this.cards){
			if(card.isOpen){
				card.el.classList.remove("hidden")
				card.el.innerText = card.name + " " + card.suit
			}
			else{
				card.el.classList.add("hidden")
				card.el.innerText = ""
			}
			this.el.appendChild(card.el)
		}
	}


	static dragCol(card){
		return card.isOpen
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
			&& topStack.isOpen)
				return true
		}
		else if(holdings[0].name == "k")
			return true
		return false
	}
}

class Klondike
{
	settingUp : boolean
	rewinding : boolean
	history   : {verse:[Object,Function,any],reverse:[Object,Function,any]}[]
	cards     : Card[]
	stacks    : {[key: string]: Stack}

	constructor(){
		this.settingUp = true

		this.rewinding = false
		this.history = []
		this.cards = this.makeCards()
		this.stacks = this.makeStacks()
		this.start()

		this.settingUp = false
	}

	addToHistory(record){
		if(!this.rewinding && !this.settingUp)
			this.history.push(record)
	}

	rewind(){
		if(this.history.length == 0) return
		
		this.rewinding = true

		const {reverse} = this.history.pop()
		console.log(reverse)
		const self = reverse.shift()
		reverse.shift().apply(self, reverse)

		this.rewinding = false
		this.render()
	}

	makeCards(){
		const cards = []
		let i = 0
		for(const suit of ["♥","♦","♣","♠"])
			for(let number = 1; number <= 13; number++)
				cards.push(new Card(this, i++, suit, number))
		return cards
	}

	makeStacks(){
		const stacks = {}
		document.querySelectorAll(".stack").forEach((el:HTMLElement,index) => {
			const stack = new Stack(this, el)
			stacks[index] = stack
			if(el.id)
				stacks[el.id] = stack
		})
		return stacks
	}

	start(){
		const deck = this.stacks.deck
		deck.addMany(this.cards)
		deck.shuffle()

		for(let i = 1; i <= 7; i++){
			const stack = this.stacks[i+5]
			stack.addMany(deck.cards.slice(deck.cards.length-i))
			stack.topCard.isOpen = true
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
			if(Number(key))
				this.stacks[key].render()
			else
				continue
	}


	static randInt(min,max){
		return Math.floor(Math.random() * (max - min) + min)
	}
}

const k = new Klondike()
console.log(k)