import React from 'react';
import axios from "axios";
import axiosRetry from 'axios-retry';
import {List} from 'react-virtualized';
import LogSummary from './LogSummary.js';

export default class LogViewer extends React.Component {

    constructor() {
        super();

        this.pollDelay = 3000;

        this.state = {
            logs: [],
            counts: {
                Info: 0,
                Warning: 0,
                Error: 0
            },
            /* This is the id of the last log message
            received by the GUI. When making a request to
            the server, the GUI will request for log entries
            starting with id lastLogId + 1 */
            lastLogId: 0,
            /* List of file names returned by the server */
            fileNames: [],
            selectedFileName: '',
            /* Default values required by the react-virtualized
            List component */
            width: 900,
            height: 750,
            rowHeight: 40           
        };

        this.severityToClass = {
            Error: 'bg-danger',
            Info: 'bg-info',
            Warning: 'bg-warning'
        }

        this.logsContainerRef = React.createRef();
        this.handleResize = this.handleResize.bind(this);
        this.handleFileChange = this.handleFileChange.bind(this);

        /* Set up axios to retry failed
        HTTP calls after a given delay. Could also substitute this
        with exponentional backoff. */
        axiosRetry(axios, { 
            retryDelay: (retryCount) => {
                return retryCount * 1000;
            }
        });
    }

    getInitialState() {
        return {
            logs: [],
            counts: {
                Info: 0,
                Warning: 0,
                Error: 0
            },
            lastLogId: 0            
        };
    }

    componentDidMount() {
        axios
            .get("/getFileNames")
            .then(res => this.setState({fileNames: res.data.sort()}));

        this.handleResize();
        window.addEventListener('resize', this.handleResize);
    }

    handleResize() {
        if(this.logsContainerRef.current) {
            this.setState({
                width: this.logsContainerRef.current.offsetWidth,
                height: this.logsContainerRef.current.offsetHeight
            });
        }
    }

    handleFileChange(event) {
        if(this.interval) {
            clearInterval(this.interval);
        }

        if(!event.target.value) {
            this.setState({...this.getInitialState(), selectedFileName: ''});
            return;
        }

        this.setState({...this.getInitialState(), selectedFileName: event.target.value});

        this.interval = setInterval(() => {
            axios
                .get(`/getLogs/${this.state.selectedFileName}/${this.state.lastLogId + 1}`)
                .then(res => {
                    if(!res.data.length) {
                        return;
                    }

                    this.setState({
                        logs: this.state.logs.concat(res.data),
                        lastLogId: res.data[res.data.length - 1].id
                    });
                    this.updateCounts(res.data);
                });
        }, this.pollDelay);

        event.preventDefault();
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    updateCounts(newLogMessages) {
        let counts = this.state.counts;

        for(let logMessage of newLogMessages) {
            if(!(logMessage.severity in counts)) {
                counts[logMessage.severity] = 1;

                continue;
            }

            counts[logMessage.severity] += 1;
        }

        this.setState({counts: counts});
    }

    /* Function required by the react-virtualized List component */
    rowRenderer = ({index, key, style}) => {
        let outerDivClass = "p-2";
        let innerDivClass = `p-1 rounded ${this.severityToClass[this.state.logs[index].severity]}`;

        let row = this.state.logs[index];

        return (
            <div className={outerDivClass} key={key} style={style}>
                <div className={innerDivClass}>{new Date(row.dateTime).toUTCString()} {row.severity} {row.message}</div>
            </div>
        );
    }

    render() {
        return (
            <div>
                <h4 className="alert alert-secondary rounded m-1 p-1">Summary</h4>
                <div className="p-2">
                    Showing log entries for file:
                    <select className="ml-2" value={this.state.selectedFileName} onChange={this.handleFileChange}>
                        <option value="">Select a file</option>
                        {
                            this.state.fileNames.map(fileName =>
                                <option key={fileName} value={fileName}>{fileName}</option>)
                        }
                    </select>
                    <LogSummary counts={this.state.counts} />
                </div>
                <h4 className="alert alert-secondary rounded m-1 p-1">Log Entries</h4>
                <div id="logs-container" style={{height: '80vh'}} ref={this.logsContainerRef}>
                    <List
                        rowCount={this.state.logs.length}
                        width={this.state.width}
                        height={this.state.height}
                        rowHeight={this.state.rowHeight}
                        rowRenderer={this.rowRenderer}
                        overscanRowCount={3}
                    />
                </div>
            </div>
        );
    }
}