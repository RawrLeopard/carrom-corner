import { Component, OnInit } from "@angular/core";
import { PlayerService } from "../Players/player.service";
import { TournamentService } from "../Tournaments/tournament.service";
import { HttpClient } from "@angular/common/http";
import { Router, ActivatedRoute } from "@angular/router";
import { BracketService } from "../Brackets/bracket.service";

@Component({
    templateUrl: 'playoffs.component.html'
})
export class PlayoffsComponent implements OnInit{
    constructor(private ps: PlayerService, public bs: BracketService, private ts: TournamentService, private http: HttpClient, private router: Router, private active_route: ActivatedRoute) {
    }

    public players = [];
    public playoffId: any;
    public winner = undefined;
    public playoff = {};
    public bracketSize = 0;
    public numberOfRounds = 0;
    public bracket: any;
    public playInRound: any;
    public playoffGames: any;
    public tournamentWinner: any;

    public isOver = true;

    

    ngOnInit() {
        this.ps.getPlayers().subscribe((players) => {
            this.players = players;
            this.playoffId = this.active_route.snapshot.paramMap.get('id');
            this.ts.getPlayoff(this.playoffId).subscribe((playoff) => {
                this.tournamentWinner = playoff['winner'];
                this.playoff = playoff;
                this.bracket = playoff['bracket'];
                this.playInRound = this.bracket.shift();
                let notice = document.getElementById('notice');
                notice.textContent = "";
                this.ts.getPlayoffGames(this.playoffId).subscribe((games) => {
                    this.playoffGames = games;
                });
                this.isOver = this.tournamentWinner;
            });
        });
        
    }

    endTournament() {
        this.ts.endTournament(this.playoffId, this.winner, this.convertToName(this.winner)).subscribe(() => this.router.navigateByUrl('/playoffs/' + this.playoffId + '/winner'));
    }

    resetBracket() {
        this.ts.getPlayoff(this.playoffId).subscribe((playoff) => {
            this.playoff = playoff;
            this.bracket = playoff['bracket'];
            this.playInRound = this.bracket.shift();
            this.winner = undefined;
        });
    }

    saveBracket() {
        if(confirm('Save the current bracket?')) {
            this.ts.updatePlayoff(this.playoff, this.bracket, this.playInRound).subscribe(() => {
                let notice = document.getElementById('notice');
                notice.textContent = "Bracket Successfully Saved \u2713"
            });
        }
    }

    enterPlayoffResult() {
        this.router.navigateByUrl('/playoffs/' + this.playoffId + '/enter_result');
    }

    advancePlayer(player, round) {
        if (round === -1) {
            let openSpotNumber = Math.ceil((this.playInRound.indexOf(player) + 1) / 2);
            let openSpotCount = 0;
            let i = 0;
            while (openSpotCount < openSpotNumber) {
                console.log(this.playoff['playInSpots']);
                if (this.playoff['playInSpots'].includes(i)) {
                    openSpotCount ++;
                }
                i ++;
            }
            this.bracket[0][i - 1] = player;
        } else if (this.bracket[round].length === 2) {
            this.winner = player.team;
            console.log(this.winner);
        } else {
            let openSpot = Math.floor(this.bracket[round].indexOf(player) / 2);
            this.bracket[round + 1][openSpot] = player;
        }
    }

    isEmpty(obj) {
        return JSON.stringify(obj) === '{}';
    }

    returnPower(i): number {
        return Math.pow(2, i);
    }

    indexArray(n: number): any[] {
        return Array(n);
    }

    getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; 
    }

    isPowerOfTwo(x) {
        return (Math.log(x)/Math.log(2)) % 1 === 0;
    }

    convertToName(team) {
        let teamString = JSON.stringify(team);
        if (team instanceof Array) {
            let firstName = this.players.find((player) => player.id === team[0]).name;
            let secondName = this.players.find((player) => player.id === team[1]).name;
            return firstName + ' & ' + secondName
        }
        return this.players.find((player) => player.id === team).name
    }
}