import { Component, OnInit } from "@angular/core";
import { AppComponent } from '../app.component';
import { Router, ActivatedRoute } from "@angular/router";
import { HttpClient } from "@angular/common/http";
import { PlayerService } from "../Services/player.service";
import { TournamentService } from "../Services/tournament.service";
import { ViewTournamentComponent } from "../Tournaments/view-tournament.component";
import { EloService } from "../Services/elo.service";
import { GameService } from "../Services/game.service";

@Component({
    templateUrl: "add-game.component.html"
})

export class AddGameComponent implements OnInit{
    
    winningTeam: string;
    scoreDifferential: number;
    gameId: string; 
    currentGame: Object;
    players = [];
    firstTeam: string;
    secondTeam: string;
    tournyName: string;
    tournyType: string;

    // variables for validating game data input
    teamsBlank = false;
    scoreBlank = false;
    scoreInvalid = false;

    constructor (   
                public _playerService: PlayerService, 
                private router: Router, 
                private http: HttpClient, 
                private active_route: ActivatedRoute,
                private elo_adjuster: EloService,
                private _gameService: GameService
            ) { 
    }

    ngOnInit () {
        this._playerService.getPlayers().subscribe((players) => {
            this.players = players;
            this.gameId = this.active_route.snapshot.paramMap.get('id');
            this.tournyType = this.active_route.snapshot.paramMap.get('type');
            this.tournyName = this.active_route.snapshot.paramMap.get('name');
            this.http.get('http://localhost:3000/games?id=' + this.gameId).subscribe((game) => {
                this.currentGame = game;
                this.firstTeam = this._playerService.convertTeamToName(this.currentGame[0].team1);
                this.secondTeam = this._playerService.convertTeamToName(this.currentGame[0].team2)
            });
        });
    }

    // Function for validating form
    validateGame() {
        this.teamsBlank = this.winningTeam === undefined;
        this.scoreBlank = this.scoreDifferential === undefined;
        this.scoreInvalid = this.scoreDifferential < 1 || this.scoreDifferential > 8;
        if (!this.teamsBlank && !this.scoreBlank && !this.scoreInvalid) {
            this.submitGame();
        }
    }

    // Updates the player database with data from the entered game
    patchDoublesPlayers() {
        let loser1, loser2;
        let winner1 = this.players.find((player) => player.id == this.currentGame[0].winner[0]);
        let winner2 = this.players.find((player) => player.id == this.currentGame[0].winner[1]);
        if (this.winningTeam === 'team1') {
            loser1 = this.players.find((player) => player.id == this.currentGame[0].team2[0]);
            loser2 = this.players.find((player) => player.id == this.currentGame[0].team2[1]);
        } else {
            loser1 = this.players.find((player) => player.id == this.currentGame[0].team1[0]);
            loser2 = this.players.find((player) => player.id == this.currentGame[0].team1[1]);
        }
        let newElos = this._playerService.getNewDoublesElos(winner1, winner2, loser1, loser2);
        this._playerService.updatePlayer(winner1.id, winner1.elo, newElos[0], winner1.wins + 1, winner1.losses, winner1.totalDiff + this.currentGame[0].differential, winner1.singlesPlayed, winner1.doublesPlayed + 1).subscribe();
        this._playerService.updatePlayer(winner2.id, winner2.elo, newElos[1], winner2.wins + 1, winner2.losses, winner2.totalDiff + this.currentGame[0].differential, winner2.singlesPlayed, winner2.doublesPlayed + 1).subscribe();
        this._playerService.updatePlayer(loser1.id, loser1.elo, newElos[2], loser1.wins, loser1.losses + 1, loser1.totalDiff - this.currentGame[0].differential, loser1.singlesPlayed, loser1.doublesPlayed + 1).subscribe();
        this._playerService.updatePlayer(loser2.id, loser2.elo, newElos[3], loser2.wins, loser2.losses + 1, loser2.totalDiff - this.currentGame[0].differential, loser2.singlesPlayed, loser2.doublesPlayed + 1).subscribe();
        this.router.navigateByUrl('/tournaments/' + this.tournyType + '/' + this.tournyName);
    }

    // Updates the player database with data from the entered game
    patchSinglesPlayers() {
        let loser;
        let winner = this.players.find((player) => player.id == this.currentGame[0].winner);
        if (this.winningTeam === 'team1') {
            loser = this.players.find((player) => player.id == this.currentGame[0].team2);
        } else {
            loser = this.players.find((player) => player.id == this.currentGame[0].team1);
        }
        let winningKFactor = this._playerService.getKFactor(winner, true);
        let losingKFactor = this._playerService.getKFactor(loser, true);
        let newWinnerElo = this.elo_adjuster.calculateNewElo(winner.elo, 1, this.elo_adjuster.calculateExpScore(winner.elo, loser.elo), winningKFactor);
        let newLoserElo = this.elo_adjuster.calculateNewElo(loser.elo, 0, this.elo_adjuster.calculateExpScore(loser.elo, winner.elo), losingKFactor);  
        this._playerService.updatePlayer(winner.id, newWinnerElo, winner.doublesElo, winner.wins + 1, winner.losses, winner.totalDiff + this.currentGame[0].differential, winner.singlesPlayed + 1, winner.doublesPlayed).subscribe();
        this._playerService.updatePlayer(loser.id, newLoserElo, loser.doublesElo, loser.wins, loser.losses + 1, loser.totalDiff - this.currentGame[0].differential, loser.singlesPlayed + 1, loser.doublesPlayed).subscribe();
        this.router.navigateByUrl('/tournaments/' + this.tournyType + '/' + this.tournyName);
    }

    

    // user submits form for game result
    submitGame() {
        let winner;
        if (this.winningTeam === 'team1') {
            winner = this.currentGame[0].team1;
        } else {
            winner = this.currentGame[0].team2;
        }
        this._gameService.updateGame(this.gameId, winner, this.scoreDifferential).subscribe(() => {
            this.http.get('http://localhost:3000/games?id=' + this.gameId).subscribe((game) => {
                this.currentGame = game;
                if (this.tournyType === 'doubles') {
                    this.patchDoublesPlayers();
                } else {
                    this.patchSinglesPlayers();
                }
            });
        });
    }
}