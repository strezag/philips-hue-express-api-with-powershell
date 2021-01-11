function Invoke-HueLightsOn {
    <#
    .SYNOPSIS
        Invokes an ON light state action against a series of lights based on of the device ID.
    .DESCRIPTION
        Calls the `/lights/setlightstate/on` API endpoint. 
   .EXAMPLE        
        # Invoke-HueLightsOn -LightIdArray @(1)
        # Invoke-HueLightsOn -LightIdArray @(2, 6)
    #>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $false)]
        [string]$ExpressApiEndpoint = "http://localhost:9000/lights/setlightstate/on",

        [Parameter(Mandatory = $true)]
        [array]$LightIdArray
    )
    
    begin {
        $body = @{ 
            lightids   = $LightIdArray;
        }
    }
    
    process {
        $response = Invoke-WebRequest $ExpressApiEndpoint `
            -Method Post `
            -ContentType "application/json" `
            -Body ($body | ConvertTo-Json) -UseBasicParsing
    }
    
    end {
        Write-Host "`n`t> Response from '$ExpressApiEndpoint': $response" 
    }
}