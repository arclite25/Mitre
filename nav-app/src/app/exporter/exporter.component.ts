import { Component, AfterViewInit, Input } from '@angular/core';
import { ViewModel } from "../viewmodels.service";
import { ConfigService } from "../config.service";
import { Technique } from '../data.service';
import * as is from 'is_js';
declare var d3: any; //d3js

@Component({
    selector: 'exporter',
    templateUrl: './exporter.component.html',
    styleUrls: ['./exporter.component.scss']
})
export class ExporterComponent implements AfterViewInit {

    @Input() exportData: ExportData;

    uid = "fo"
    svgDivName = "svgInsert" + this.uid;
    width: number = 11;
    height: number = 8.5;
    fontSize: number = 12;
    whUnits: string = 'in'; //can also be 'cm', 'in'
    constructor(private configService: ConfigService) { }

    ngAfterViewInit() {
        this.buildSVG()
    }

    buildSVG(): void {
        console.log("building SVG");

        let width = this.convertToPx(this.width, this.whUnits)
        let height = this.convertToPx(this.height, this.whUnits)
        let fontSize = this.fontSize; let fontUnits = 'pt'

        let self = this;
        let margin = {top: 5, right: 5, bottom: 5, left: 5};
        let headerHeight = 133


        let element = <HTMLElement>document.getElementById(this.svgDivName);
        element.innerHTML = "";

        let svg = d3.select("#" + this.svgDivName).append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("id", "svg" + this.uid) //Tag for downloadSVG
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        let stroke_width = 1;
        svg.append("rect")
            .attr("width", width - margin.right - stroke_width/2)
            .attr("height", height - margin.bottom - stroke_width/2)
            .style("stroke", "black")
            .style("stroke-width", stroke_width)
            .style("fill", "none")
        //header
        let header = svg.append("g");
        header.append("rect")
            .attr("width", width)
            .attr("height", headerHeight)
            .style("fill", "rgba(99, 143, 98, 0.5)");
        // header text
        header.append("text")
            .text("header")
            .attr("x", "50%")
            .attr("y", headerHeight/2)
            .attr("font-size", fontSize + fontUnits)
            .attr("fill", "black");
        // general table body
        let tablebody = svg.append("g")
            .attr("transform", "translate(0," + headerHeight + ")")


        // columns
        let columnWidth = (width - margin.right)/(Object.keys(self.exportData.tactics).length)
        let columns = tablebody.selectAll("g")
            .data(Object.keys(this.exportData.tactics)).enter()
            .append("g")
            .attr("transform", function(d,i) {
                // console.log(d,i)
                return "translate(" + columnWidth * i + ", 0)"
            });

        //calculate cell height: the longest column decides the cell height
        let cellHeight = Number.MAX_VALUE;//Number.MAX_VALUE; //(height - margin.bottom - headerHeight)
        Object.keys(self.exportData.tactics).forEach(function(key: string) {
            let thisCellHeight = (height - margin.bottom - headerHeight)/(self.exportData.tactics[key].length)
            cellHeight = Math.min(cellHeight, thisCellHeight)
        });

        let techniques = columns.selectAll("g")
            .data(function(d) {
                // console.log(d)
                return self.exportData.tactics[d]
            }).enter().append("g")
                .attr("transform", function(d, i) {
                    return "translate(0," + i * cellHeight + ")"
                });


        techniques.append("rect")
            .attr("width", columnWidth)
            .attr("height", cellHeight)
            .style("stroke", "black")
            .style("fill", function(d) {
                if (!self.exportData.viewModel.hasTechniqueVM(d.technique_id)) return "white";
                let tvm = self.exportData.viewModel.getTechniqueVM(d.technique_id);
                if (tvm.color) return tvm.color
                if (tvm.score) return tvm.scoreColor
                return "none"
            });
        techniques.append("text")
            .text(function(d) {return [d.name, 'acr', ''][self.exportData.viewModel.viewMode]})
            .attr("font-size", fontSize + fontUnits)
            .attr("transform", "translate(1, " + (fontSize + 1) +")")
            .attr("dx", 0)
            .attr("dy", 0)
            .call(this.wrap, columnWidth, cellHeight, self)

    }

    downloadSVG() {
        let svgEl = document.getElementById("svg" + this.uid);
        svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        let svgData = new XMLSerializer().serializeToString(svgEl);
        // // var svgData = svgEl.outerHTML;
        // console.log(svgData)
        // let svgData2 = new XMLSerializer().serializeToString(svgEl);
        // console.log(svgData2)
        let filename = this.exportData.viewModel.name.split(' ').join('_');
        filename = filename.replace(/\W/g, "")  + ".svg"; // remove all non alphanumeric characters
        var preface = '<?xml version="1.0" standalone="no"?>\r\n';
        var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
        if (is.ie()) { //internet explorer
            window.navigator.msSaveBlob(svgBlob, filename)
        } else {
            var svgUrl = URL.createObjectURL(svgBlob);
            var downloadLink = document.createElement("a");
            downloadLink.href = svgUrl;
            downloadLink.download = filename
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }

    }

    /**
     * Convert any length in various units to pixels
     * @param  quantity what length
     * @param  unit     which unit system (in, cm, px?)
     * @return          that length in pixels
     */
    convertToPx(quantity: number, unit: string): number {
        let factor;

        switch(unit) {
            case "in": {
                factor = 96
                break
            }
            case "cm": {
                factor = 3.779375 * 10;
                break;
            }
            case "px": {
                factor = 1;
                break;
            }
            case "em": {
                factor = 16;
                break;
            }
            default: {
                console.error("unknown unit", unit)
                factor = 0;
            }
        }

        return quantity * factor;
    }

    /**
     * wrap the given text svg element
     * @param  text       element to wrap
     * @param  width      width to wrap to
     * @param  cellheight stop appending wraps after this height
     * @param  self       reference to self this component because of call context
     */
    wrap(text, width, cellheight, self): void {
        text.each(function() {
            var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy")),
            tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    let thisdy = ++lineNumber * lineHeight + dy
                    if (self.convertToPx(thisdy, "em") > cellheight) return;
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", thisdy + "em").text(word);
                }
            }
        });
    }
}

export class ExportData {
    viewModel: ViewModel;
    tactics: object;
    filteredTechniques: Technique[];
    constructor(viewModel, tactics, filteredTechniques: Technique[]) {
        this.viewModel = viewModel; this.tactics = tactics; this.filteredTechniques = filteredTechniques;
        console.log(viewModel, tactics, filteredTechniques)
    }
}