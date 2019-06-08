import { Component, OnInit } from '@angular/core';
import { PlayerService } from '../Services/player.service';
import { HttpClient } from '@angular/common/http';
import { Player } from '../Players/player';
import { TournamentService } from '../Services/tournament.service';
import { Tournament } from './tournament';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { Pool } from '../Pools/pool';
import { Game } from '../Games/game';
import { GameService } from '../Services/game.service';


/* Component for creating a singles tournament. Includes functions for presenting setup parameters
and for generating the pools and schedule */
@Component({
    templateUrl: 'add-tournament.component.html'
})
export class AddTournamentComponent implements OnInit {
    constructor(private _playerService: PlayerService,
                private _tournyService: TournamentService,
                private http: HttpClient,
                private router: Router,
                public active_route: ActivatedRoute,
                private _gameService: GameService) {
    }

    public playersInTourny = new Set();
    public playersToAdd = new Set();
    public teamIds = [];
    public doublesTeamIds = [];
    public tournyType = 'singles';
    public players = [];
    public tournaments: Tournament[];
    public tournament: Tournament;
    public robinType = 'Single';
    public generatedPools = [];
    public scheduleIndices = [];
    public tournamentName: string;
    public id = 0;


    nameBlank = false;
    nameForbidden = false;
    rosterForbidden = false;
    rosterUneven = false;
    nameFormatInvalid = false;

    ngOnInit () {
        this.tournyType = this.active_route.snapshot.paramMap.get('type');
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.tournyType = this.active_route.snapshot.paramMap.get('type');
            }
        });

        this._tournyService.getTournaments().subscribe((tournaments) => this.tournaments = tournaments);

        this._playerService.getPlayers().subscribe((players) => {
            this.players = players;
            for (const eachPlayer of this.players) {
                this.playersToAdd.add(eachPlayer);
            }
        });
    }

    tournamentValidator() {
        this.nameBlank = !this.tournamentName;
        this.nameFormatInvalid = this.tournamentName && !(/^[a-zA-Z0-9 ]*$/).test(this.tournamentName);
        if (this.tournyType === 'doubles') {
            this.rosterUneven = this.playersInTourny.size % 2 !== 0;
        } else {
            this.rosterUneven = false;
        }
        this.nameForbidden = this.checkTournyName();
        this.rosterForbidden = this.playersInTourny.size < 2;
        if (!this.nameForbidden && !this.rosterForbidden && !this.nameBlank && !this.rosterUneven) {
            this.createTourny();
        }
    }

    checkTournyName() {
        for (const tournament of this.tournaments) {
            if (this.tournamentName && tournament.name.toLowerCase() === this.tournamentName.toLowerCase()) {
                return true;
            }
        }
        return false;
    }

    // Adds player to current working roster
    addPlayer(currentPlayer: Player) {
        this.playersInTourny.add(currentPlayer);
        this.teamIds.push(currentPlayer.id);
        this.playersToAdd.delete(currentPlayer);
    }

    // Removes player from current working roster
    removePlayer(currentPlayer: Player) {
        this.playersInTourny.delete(currentPlayer);
        this.playersToAdd.add(currentPlayer);
        const index = this.teamIds.findIndex((id) => id === currentPlayer.id);
        this.teamIds.splice(index, 1);
    }

    // Creates a tournament object and calls the tournament service to add to the database
    createTourny() {
        if (this.tournyType === 'doubles') {
            this.generateTeams();

            // TODO: NOT pass undefined as the id for new tournaments. Implement global sequence/generator ID service
            this.tournament = new Tournament(
              undefined, false, undefined, this.tournamentName,
              false, this.playersInTourny.size / 2, this.doublesTeamIds
            );
            this._tournyService.addTournament(this.tournament).subscribe(() => {
                this._tournyService.getTournament(this.tournament.name).subscribe((tournament) => {
                    this.id = tournament[0].id;
                    if (this.tournament.size >= 8) {
                        this.generatePools(this.doublesTeamIds);
                        this.generateSchedule(this.generatedPools);
                    } else {
                        this.generateSchedule([this.doublesTeamIds]);
                        this.addPool([this.doublesTeamIds]);
                    }
                });
            });
        } else {
            this.tournament = new Tournament(undefined, false, undefined, this.tournamentName, true, this.playersInTourny.size, this.teamIds);
            this._tournyService.addTournament(this.tournament).subscribe(() => {
                this._tournyService.getTournament(this.tournament.name).subscribe((tournament) => {
                    this.id = tournament[0].id;
                    if (this.tournament.size >= 8) {
                        this.generatePools(this.teamIds);
                        this.generateSchedule(this.generatedPools);

                    } else {
                        this.generateSchedule([this.teamIds]);
                        this.addPool([this.teamIds]);
                    }
                });
            });
        }
    }

    // Gets a random integer in the specified range (inclusive)
    getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Adds all remaining players to the working roster at once
    addAll() {
        this.playersToAdd.forEach( (player) => {
            this.playersInTourny.add(player);
            this.teamIds.push(player.id);
            this.playersToAdd.delete(player);
        });
    }

    // After generating balanced pools, rations remaining players among created pools
    distributeLeftovers(sameSizePools, leftovers, teams) {
        let i = 0;
        let j = 0;
        while (i < leftovers) {
            // leftovers are greater than the number of pools available
            if (j === sameSizePools) {
                j = 0;
            }
            const rnd = this.getRandomIntInclusive(0, this.teamIds.length - 1);
            const removedPlayer = teams.splice(rnd, 1)[0];
            this.generatedPools[j].push(removedPlayer);

            i ++;
            j ++;
        }
    }

    addPool(pool) {
        const newPool = new Pool(this.id, pool, this.tournamentName);
        this._tournyService.addPool(newPool).subscribe(() => {
            this.router.navigateByUrl('/tournaments/' + this.tournyType + '/' + this.tournamentName);
        });
    }

    // Takes the selected roster and generates an appropriate player pool distribution
    generatePools(teams) {
        let optimalGroupSize = 0;
        if (this.tournament.size <= 16) {
            optimalGroupSize = 4;
        } else if (this.tournament.size > 16 && this.tournament.size < 24) {
            optimalGroupSize = 5;
        } else {
            optimalGroupSize = 6;
        }

        const sameSizePools = Math.floor(teams.length / optimalGroupSize);
        const leftovers = teams.length % optimalGroupSize;

        for (let i = 0; i < sameSizePools; i++) {
            const newPool = [];
            for (let j = 0; j < optimalGroupSize; j++) {
                const rnd = this.getRandomIntInclusive(0, teams.length - 1);
                const removedPlayer = teams.splice(rnd, 1)[0];
                newPool.push(removedPlayer);
            }
            this.generatedPools.push(newPool);
        }
        this.distributeLeftovers(sameSizePools, leftovers, teams);
        this.addPool(this.generatedPools);
    }

    // Generates a round robin set of games and schedules them randomly
    generateSchedule (pools) {
        this.generateGames(pools);
        if (this.robinType === 'Double') {
            this.generateGames(pools);
        }
    }

    generateTeams() {
        while (this.teamIds.length > 0) {
            const teammate1 = this.teamIds.splice(this.getRandomIntInclusive(0, this.teamIds.length - 1), 1)[0];
            const teammate2 = this.teamIds.splice(this.getRandomIntInclusive(0, this.teamIds.length - 1), 1)[0];
            const newTeam = [teammate1, teammate2];
            this.doublesTeamIds.push(newTeam);
        }
    }

    // creates all games for one round robin round for every pool
    generateGames(pools) {
        let numberOfGames = 0;
        for (let i = 0; i < pools.length; i++) {
            numberOfGames = numberOfGames + (pools[i].length * (pools[i].length - 1) / 2);
        }
        for (let i = 0; i < numberOfGames; i++) {
            this.scheduleIndices.push(i);
        }
        for (const pool of pools) {
            let j = 0;
            let i = j + 1;
            while (j < pool.length - 1) {
                while (i < pool.length) {
                    const rnd = this.getRandomIntInclusive(0, this.scheduleIndices.length - 1);
                    const removedIndex = this.scheduleIndices.splice(rnd, 1)[0];
                    const newGame = new Game(undefined, false, this.id, removedIndex, pool[j], pool[i], undefined, 0, undefined);
                    this._gameService.addGame(newGame).subscribe();
                    i++;
                }
                j++;
                i = j + 1;
            }
        }
    }
}
